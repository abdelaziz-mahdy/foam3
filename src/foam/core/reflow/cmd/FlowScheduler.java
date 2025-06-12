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
import java.util.Date;
import java.io.IOException;
import java.nio.file.Paths;

public class FlowScheduler extends ContextAwareAgent {
  private final boolean headless;
  private final int timeoutSeconds;
  private final int checkIntervalSeconds;
  private final int maxChecks;

  public FlowScheduler() {
    this.headless = true;
    this.timeoutSeconds = 15; // 5 minutes
    this.checkIntervalSeconds = 5;
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

    Date now = new Date();

    // Find flows that have a schedule defined and should run
    ArraySink sink = (ArraySink) flowDAO
        .where(MLang.NOT(MLang.EQ(Flow.SCHEDULE, null)))
        .select(new ArraySink());

    if (sink.getArray().size() == 0) {
      logger.info("No scheduled flows found at " + now);
      return;
    }

    logger.info("Found " + sink.getArray().size() + " scheduled flows to check");

    // Initialize Playwright once for all flows
    Playwright playwright = null;

    try {
      playwright = Playwright.create();

      int executedCount = 0;
      for (Object flowObj : sink.getArray()) {
        Flow flow = (Flow) flowObj;
        Browser browser = null;
        BrowserContext context = null;
        Page page = null;

        try {
          // Check if flow should run based on its schedule and last run time
          if (flow.getSchedule() == null) {
            logger.info("Flow '" + flow.getName() + "' has no schedule - skipping");
            continue;
          }

          Date lastRun = flow.getLastRun();
          if (lastRun == null) {
            lastRun = new Date(0); // Use epoch if never run
          }

          Date nextScheduledTime = flow.getSchedule().getNextScheduledTime(x, lastRun);
          if (nextScheduledTime == null || nextScheduledTime.getTime() > now.getTime()) {
            logger.info(
                "Flow '" + flow.getName() + "' not ready to run - next run: " + nextScheduledTime + " - skipping");
            continue;
          }

          executedCount++;
          logger.info("Executing scheduled flow: " + flow.getName());

          // Clone the flow before making changes (object is frozen)
          Flow clonedFlow = (Flow) flow.fclone();

          // Update last run timestamp
          clonedFlow.setLastRun(now);
          flowDAO.put(clonedFlow);

          // Get or create a real session for authentication using the flow's creator
          String sessionID = null;
          DAO sessionDAO = (DAO) x.get("sessionDAO");
          DAO userDAO = (DAO) x.get("userDAO");

          if (sessionDAO == null || userDAO == null) {
            logger.error("Required DAOs not available - skipping flow: " + flow.getName());
            continue;
          }

          // Get the user who created this flow
          User flowCreator = null;
          Long createdBy = flow.getCreatedBy();

          if (createdBy != null && createdBy > 0) {
            flowCreator = (User) userDAO.find(createdBy);
            logger.info("Found flow creator with ID: " + createdBy);
          }

          if (flowCreator == null) {
            logger.error("Flow creator not found for flow: " + flow.getName() + " - skipping");
            continue;
          }

          // Create a session for the flow creator
          X userX = foam.util.Auth.sudo(x, flowCreator);
          Session session = userX.get(Session.class);

          // Put session in DAO and get the session ID
          sessionDAO.put(session);
          sessionID = session.getId();
          logger.info("Created session " + sessionID + " for flow creator: " + flowCreator.getId());

          // Build the flow URL
          String flowURL = "http://localhost:8080/" + "?sessionId=" + sessionID + "#flow/" + flow.getName();

          // Create a new browser instance for each flow
          BrowserType.LaunchOptions launchOptions = new BrowserType.LaunchOptions()
              .setHeadless(headless);

          browser = playwright.chromium().launch(launchOptions);

          // Use Playwright to run the flow
          logger.info("Opening flow URL: " + flowURL);

          // Create a new browser context for this flow
          context = browser.newContext();
          page = context.newPage();

          // Set timeout for navigation
          page.setDefaultTimeout(timeoutSeconds * 1000);

          // Navigate to the flow URL
          page.navigate(flowURL);

          // Wait for the page to load and check for completion
          logger.info("Waiting for flow to complete...");

          // Wait for the page to be fully loaded
          page.waitForLoadState();

          // Check for completion by looking for specific UI elements
          boolean isComplete = false;
          int checkCount = 0;
          long startTime = System.currentTimeMillis();

          while (!isComplete && checkCount < maxChecks) {
            try {
              checkCount++;
              double elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000.0;

              // Check if we've exceeded the timeout
              if (elapsedSeconds >= timeoutSeconds) {
                logger.warning("Flow execution timed out after " + timeoutSeconds + " seconds");
                break;
              }

              // Get the current page content
              String pageContent = (String) page.evaluate("() => document.body.innerText");
              logger.info(String.format("Check #%d (%.1f seconds elapsed) - Flow: %s",
                  checkCount, elapsedSeconds, flow.getName()));
              logger.debug("Current page content: " + pageContent);

              // Check for various completion indicators
              if (pageContent.contains("GRANTED") ||
                  pageContent.contains("COMPLETED") ||
                  pageContent.contains("Success") ||
                  pageContent.contains("Done") ||
                  pageContent.contains("Flow completed") ||
                  pageContent.contains("Execution complete")) {
                isComplete = true;
                logger.info("Flow completed successfully! Found completion indicator.");
                break;
              }

              // Check for error states
              if (pageContent.contains("Error") ||
                  pageContent.contains("Failed") ||
                  pageContent.contains("Exception") ||
                  pageContent.contains("Access denied")) {
                logger.warning("Flow encountered an error state: " + pageContent);
                break;
              }

              // Check if the flow is still running
              if (pageContent.contains("Running") ||
                  pageContent.contains("In Progress") ||
                  pageContent.contains("Processing")) {
                logger.info("Flow is still running...");
              }

              // Take a screenshot every 5 checks for debugging
              if (checkCount % 5 == 0 && !headless) {
                String screenshotPath = String.format("flow-progress-%s-%d.png", flow.getName(), checkCount);
                page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(screenshotPath)));
                logger.info("Saved progress screenshot: " + screenshotPath);
              }

              // Check if we're approaching timeout
              if (elapsedSeconds >= timeoutSeconds * 0.8) {
                logger.warning("Flow is approaching timeout limit (" + timeoutSeconds + " seconds)");
              }

              // Wait before next check
              Thread.sleep(checkIntervalSeconds * 1000);

            } catch (Exception e) {
              logger.error("Error checking flow status: " + e.getMessage());
              e.printStackTrace();
              break;
            }
          }

          if (!isComplete) {
            logger.warning("Flow did not complete within the timeout period of " + timeoutSeconds + " seconds");
            String finalContent = (String) page.evaluate("() => document.body.innerText");
            logger.warning("Last known page content: " + finalContent);

            if (!headless) {
              String timeoutScreenshot = "flow-timeout-" + flow.getName() + ".png";
              page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(timeoutScreenshot)));
              logger.info("Saved timeout screenshot: " + timeoutScreenshot);
            }
          }

          // Get final page content for logging
          Object result = page.evaluate("() => { return document.body.innerText; }");
          logger.info("Final page content: " + result);

          logger.info("Completed execution of scheduled flow: " + flow.getName());
        } catch (Exception e) {
          logger.error("Failed to execute scheduled flow: " + flow.getName() + ", error: " + e.getMessage());
          e.printStackTrace();
        } finally {
          // Clean up resources for this flow
          if (page != null) {
            try {
              page.close();
            } catch (Exception e) {
              logger.warning("Error closing page: " + e.getMessage());
            }
          }
          if (context != null) {
            try {
              context.close();
            } catch (Exception e) {
              logger.warning("Error closing context: " + e.getMessage());
            }
          }
          if (browser != null) {
            try {
              browser.close();
            } catch (Exception e) {
              logger.warning("Error closing browser: " + e.getMessage());
            }
          }
        }
      }

      logger.info("Flow scheduler completed - executed " + executedCount + " flows");
    } catch (Exception e) {
      logger.error("Error initializing Playwright: " + e.getMessage());
      e.printStackTrace();
    } finally {
      // Clean up Playwright resources
      if (playwright != null) {
        try {
          playwright.close();
        } catch (Exception e) {
          logger.warning("Error closing playwright: " + e.getMessage());
        }
      }
    }
  }
}