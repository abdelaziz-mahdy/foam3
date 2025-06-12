package foam.core.reflow.cmd;

import foam.dao.DAO;
import foam.mlang.MLang;
import foam.core.reflow.Flow;
import foam.dao.ArraySink;
import foam.core.auth.User;
import foam.core.session.Session;
import foam.core.logger.Logger;
import foam.lang.X;
import foam.lang.ContextAwareAgent;
import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import java.util.Date;
import java.io.IOException;
import java.nio.file.Paths;

public class FlowScheduler extends ContextAwareAgent {
  // Configuration constants
  private static final boolean DEFAULT_HEADLESS = true;
  private static final int DEFAULT_TIMEOUT_SECONDS = 15;
  private static final int DEFAULT_CHECK_INTERVAL_SECONDS = 5;
  private static final int SCREENSHOT_INTERVAL = 5;
  private static final double TIMEOUT_WARNING_THRESHOLD = 0.8;
  private static final String BASE_URL = "http://localhost:8080/";
  private static final long EPOCH_TIME = 0L;
  
  // Completion indicators
  private static final String[] COMPLETION_INDICATORS = {
    "GRANTED", "COMPLETED", "Success", "Done", "Flow completed", "Execution complete"
  };
  
  // Error indicators
  private static final String[] ERROR_INDICATORS = {
    "Error", "Failed", "Exception", "Access denied"
  };
  
  // Progress indicators
  private static final String[] PROGRESS_INDICATORS = {
    "Running", "In Progress", "Processing"
  };

  private final boolean headless;
  private final int timeoutSeconds;
  private final int checkIntervalSeconds;
  private final int maxChecks;

  public FlowScheduler() {
    this.headless = DEFAULT_HEADLESS;
    this.timeoutSeconds = DEFAULT_TIMEOUT_SECONDS;
    this.checkIntervalSeconds = DEFAULT_CHECK_INTERVAL_SECONDS;
    this.maxChecks = timeoutSeconds / checkIntervalSeconds;
  }

  @Override
  public void execute(X x) {
    Logger logger = (Logger) x.get("logger");
    DAO flowDAO = (DAO) x.get("flowDAO");

    if (flowDAO == null) {
      logger.info("flowDAO not found - skipping flow background runner");
      return;
    }

    ArraySink scheduledFlows = getScheduledFlows(flowDAO, logger);
    if (scheduledFlows == null) return;

    executeScheduledFlows(x, logger, flowDAO, scheduledFlows);
  }

  private ArraySink getScheduledFlows(DAO flowDAO, Logger logger) {
    Date now = new Date();
    ArraySink sink = (ArraySink) flowDAO
        .where(MLang.NOT(MLang.EQ(Flow.SCHEDULE, null)))
        .select(new ArraySink());

    if (sink.getArray().size() == 0) {
      logger.info("No scheduled flows found at " + now);
      return null;
    }

    logger.info("Found " + sink.getArray().size() + " scheduled flows to check");
    return sink;
  }

  private void executeScheduledFlows(X x, Logger logger, DAO flowDAO, ArraySink scheduledFlows) {
    Playwright playwright = null;
    try {
      playwright = Playwright.create();
      int executedCount = 0;
      
      for (Object flowObj : scheduledFlows.getArray()) {
        Flow flow = (Flow) flowObj;
        try{
        if (executeFlow(x, logger, flowDAO, playwright, flow)) {
          executedCount++;
        }}
        catch (Exception e) {
          logger.error("Error executing flow: " + flow.getName() + " - " + e.getMessage());
          e.printStackTrace();
        }
      }
      
      logger.info("Flow scheduler completed - executed " + executedCount + " flows");
    } catch (Exception e) {
      logger.error("Error initializing Playwright: " + e.getMessage());
      e.printStackTrace();
    } finally {
      safeClose(playwright, logger, "playwright");
    }
  }

  private boolean executeFlow(X x, Logger logger, DAO flowDAO, Playwright playwright, Flow flow) {
    if (!shouldExecuteFlow(x, logger, flow)) {
      return false;
    }

    logger.info("Executing scheduled flow: " + flow.getName());
    
    // Create session first to get proper authorization context
    SessionInfo sessionInfo = createFlowSession(x, logger, flow);
    if (sessionInfo == null) {
      return false;
    }
    
    // Update flow lastRun with proper authorization context
    updateFlowLastRun(sessionInfo.userX, flowDAO, flow, new Date());

    Browser browser = null;
    BrowserContext context = null;
    Page page = null;

    try {
      browser = createBrowser(playwright);
      context = browser.newContext();
      page = context.newPage();
      
      String flowURL = buildFlowURL(sessionInfo.sessionID, flow.getName());
      navigateToFlow(logger, page, flowURL);
      
      boolean completed = monitorFlowExecution(logger, page, flow);
      logFlowCompletion(logger, page, flow, completed);
      
      return true;
    } catch (Exception e) {
      logger.error("Failed to execute scheduled flow: " + flow.getName() + ", error: " + e.getMessage());
      e.printStackTrace();
      return false;
    } finally {
      cleanupBrowserResources(logger, page, context, browser);
    }
  }

  private boolean shouldExecuteFlow(X x, Logger logger, Flow flow) {
    if (flow.getSchedule() == null) {
      logger.info("Flow '" + flow.getName() + "' has no schedule - skipping");
      return false;
    }

    Date now = new Date();
    Date lastRun = flow.getLastRun();
    if (lastRun == null) {
      lastRun = new Date(EPOCH_TIME);
    }

    Date nextScheduledTime = flow.getSchedule().getNextScheduledTime(x, lastRun);
    if (nextScheduledTime == null || nextScheduledTime.getTime() > now.getTime()) {
      logger.info("Flow '" + flow.getName() + "' not ready to run - next run: " + nextScheduledTime + " - skipping");
      return false;
    }

    return true;
  }

  private void updateFlowLastRun(X userX, DAO flowDAO, Flow flow, Date now) {
    try {
      DAO authorizedFlowDAO = (DAO) userX.get("flowDAO");
      Flow clonedFlow = (Flow) flow.fclone();
      clonedFlow.setLastRun(now);
      authorizedFlowDAO.put(clonedFlow);
    } catch (Exception e) {
      // If we can't update with user context, try with system context as fallback
      Flow clonedFlow = (Flow) flow.fclone();
      clonedFlow.setLastRun(now);
      flowDAO.put(clonedFlow);
    }
  }

  private SessionInfo createFlowSession(X x, Logger logger, Flow flow) {
    DAO sessionDAO = (DAO) x.get("sessionDAO");
    DAO userDAO = (DAO) x.get("userDAO");

    if (sessionDAO == null || userDAO == null) {
      logger.error("Required DAOs not available - skipping flow: " + flow.getName());
      return null;
    }

    User flowCreator = getFlowCreator(userDAO, logger, flow);
    if (flowCreator == null) {
      return null;
    }

    X userX = foam.util.Auth.sudo(x, flowCreator);
    Session session = userX.get(Session.class);
    sessionDAO.put(session);
    
    String sessionID = session.getId();
    logger.info("Created session " + sessionID + " for flow creator: " + flowCreator.getId());
    return new SessionInfo(sessionID, userX);
  }

  private User getFlowCreator(DAO userDAO, Logger logger, Flow flow) {
    Long createdBy = flow.getCreatedBy();
    if (createdBy == null || createdBy <= 0) {
      logger.error("Flow creator not found for flow: " + flow.getName() + " - skipping");
      return null;
    }

    User flowCreator = (User) userDAO.find(createdBy);
    if (flowCreator == null) {
      logger.error("Flow creator not found for flow: " + flow.getName() + " - skipping");
      return null;
    }

    logger.info("Found flow creator with ID: " + createdBy);
    return flowCreator;
  }

  private String buildFlowURL(String sessionID, String flowName) {
    return BASE_URL + "?sessionId=" + sessionID + "#flow/" + flowName;
  }

  private Browser createBrowser(Playwright playwright) {
    BrowserType.LaunchOptions launchOptions = new BrowserType.LaunchOptions().setHeadless(headless);
    return playwright.chromium().launch(launchOptions);
  }

  private void navigateToFlow(Logger logger, Page page, String flowURL) throws Exception {
    logger.info("Opening flow URL: " + flowURL);
    page.setDefaultTimeout(timeoutSeconds * 1000);
    
    logger.info("Navigating to flow URL: " + flowURL);
    try {
      page.navigate(flowURL, new Page.NavigateOptions().setTimeout(timeoutSeconds * 1000));
      logger.info("Page navigation completed");
    } catch (Exception e) {
      logger.error("Failed to load page within " + timeoutSeconds + " seconds: " + e.getMessage());
      throw e;
    }

    logger.info("Waiting for flow to complete...");
    try {
      page.waitForLoadState(LoadState.NETWORKIDLE, new Page.WaitForLoadStateOptions().setTimeout(timeoutSeconds * 1000));
      logger.info("Page load state reached: NETWORKIDLE");
    } catch (Exception e) {
      logger.error("Failed to reach NETWORKIDLE state within " + timeoutSeconds + " seconds: " + e.getMessage());
      throw e;
    }
  }

  private boolean monitorFlowExecution(Logger logger, Page page, Flow flow) {
    boolean isComplete = false;
    int checkCount = 0;
    long startTime = System.currentTimeMillis();

    while (!isComplete && checkCount < maxChecks) {
      try {
        checkCount++;
        double elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000.0;

        if (elapsedSeconds >= timeoutSeconds) {
          logger.warning("Flow execution timed out after " + timeoutSeconds + " seconds");
          break;
        }

        String pageContent = getPageContent(logger, page);
        logger.info(String.format("Check #%d (%.1f seconds elapsed) - Flow: %s", checkCount, elapsedSeconds, flow.getName()));
        logger.info("Current page content: " + pageContent);

        FlowStatus status = determineFlowStatus(pageContent);
        if (status == FlowStatus.COMPLETED) {
          isComplete = true;
          logger.info("Flow completed successfully! Found completion indicator.");
          break;
        } else if (status == FlowStatus.ERROR) {
          logger.warning("Flow encountered an error state: " + pageContent);
          break;
        } else if (status == FlowStatus.RUNNING) {
          logger.info("Flow is still running...");
        }

        handlePeriodicTasks(logger, page, flow, checkCount, elapsedSeconds);
        Thread.sleep(checkIntervalSeconds * 1000);

      } catch (Exception e) {
        logger.error("Error checking flow status: " + e.getMessage());
        e.printStackTrace();
        break;
      }
    }

    return isComplete;
  }

  private String getPageContent(Logger logger, Page page) {
    try {
      return (String) page.evaluate("() => document.body.innerText");
    } catch (Exception e) {
      logger.error("Failed to get page content: " + e.getMessage());
      return "Error getting page content: " + e.getMessage();
    }
  }

  private FlowStatus determineFlowStatus(String pageContent) {
    for (String indicator : COMPLETION_INDICATORS) {
      if (pageContent.contains(indicator)) {
        return FlowStatus.COMPLETED;
      }
    }
    
    for (String indicator : ERROR_INDICATORS) {
      if (pageContent.contains(indicator)) {
        return FlowStatus.ERROR;
      }
    }
    
    for (String indicator : PROGRESS_INDICATORS) {
      if (pageContent.contains(indicator)) {
        return FlowStatus.RUNNING;
      }
    }
    
    return FlowStatus.UNKNOWN;
  }

  private void handlePeriodicTasks(Logger logger, Page page, Flow flow, int checkCount, double elapsedSeconds) {
    if (checkCount % SCREENSHOT_INTERVAL == 0 && !headless) {
      takeScreenshot(logger, page, flow.getName(), checkCount);
    }

    if (elapsedSeconds >= timeoutSeconds * TIMEOUT_WARNING_THRESHOLD) {
      logger.warning("Flow is approaching timeout limit (" + timeoutSeconds + " seconds)");
    }
  }

  private void takeScreenshot(Logger logger, Page page, String flowName, int checkCount) {
    try {
      String screenshotPath = String.format("flow-progress-%s-%d.png", flowName, checkCount);
      page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(screenshotPath)));
      logger.info("Saved progress screenshot: " + screenshotPath);
    } catch (Exception e) {
      logger.warning("Failed to take screenshot: " + e.getMessage());
    }
  }

  private void logFlowCompletion(Logger logger, Page page, Flow flow, boolean completed) {
    if (!completed) {
      logger.warning("Flow did not complete within the timeout period of " + timeoutSeconds + " seconds");
      String finalContent = getPageContent(logger, page);
      logger.warning("Last known page content: " + finalContent);

      if (!headless) {
        takeTimeoutScreenshot(logger, page, flow.getName());
      }
    }

    Object result = page.evaluate("() => { return document.body.innerText; }");
    logger.info("Final page content: " + result);
    logger.info("Completed execution of scheduled flow: " + flow.getName());
  }

  private void takeTimeoutScreenshot(Logger logger, Page page, String flowName) {
    try {
      String timeoutScreenshot = "flow-timeout-" + flowName + ".png";
      page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(timeoutScreenshot)));
      logger.info("Saved timeout screenshot: " + timeoutScreenshot);
    } catch (Exception e) {
      logger.warning("Failed to take timeout screenshot: " + e.getMessage());
    }
  }

  private void cleanupBrowserResources(Logger logger, Page page, BrowserContext context, Browser browser) {
    safeClose(page, logger, "page");
    safeClose(context, logger, "context");
    safeClose(browser, logger, "browser");
  }

  private void safeClose(Object resource, Logger logger, String resourceName) {
    if (resource == null) return;
    
    try {
      if (resource instanceof Page) {
        Page page = (Page) resource;
        if (!page.isClosed()) {
          page.close();
        }
      } else if (resource instanceof BrowserContext) {
        ((BrowserContext) resource).close();
      } else if (resource instanceof Browser) {
        Browser browser = (Browser) resource;
        if (browser.isConnected()) {
          browser.close();
        }
      } else if (resource instanceof Playwright) {
        ((Playwright) resource).close();
      }
    } catch (Exception e) {
      logger.warning("Error closing " + resourceName + ": " + e.getMessage());
    }
  }

  private enum FlowStatus {
    COMPLETED, ERROR, RUNNING, UNKNOWN
  }
  
  private static class SessionInfo {
    final String sessionID;
    final X userX;
    
    SessionInfo(String sessionID, X userX) {
      this.sessionID = sessionID;
      this.userX = userX;
    }
  }
}