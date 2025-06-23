/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.core.reflow.headless;

import foam.lang.ContextAwareSupport;
import foam.lang.X;
import foam.core.logger.Logger;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

public class ServerHeadlessRunnerService extends ContextAwareSupport implements HeadlessRunnerService {

  private Logger logger = null;
  private final Map<String, HeadlessRunner> runningInstances = new ConcurrentHashMap<>();

  public ServerHeadlessRunnerService(X x) {
    setX(x);
    logger = (Logger) x.get("logger");
  }

  @Override
  public String addRunner(String flowName, String sessionId) {
    String runnerId = UUID.randomUUID().toString();
    HeadlessRunner runner = new HeadlessRunner();
    runner.setId(runnerId);
    runner.setFlowName(flowName);
    runner.setSessionId(sessionId);
    runner.setStartTime(new Date());
    
    runningInstances.put(runnerId, runner);
    logger.info("Added headless runner: " + runnerId + " for flow: " + flowName);
    return runnerId;
  }

  @Override
  public boolean removeRunner(String runnerId) {
    synchronized (runningInstances) {
      HeadlessRunner runner = runningInstances.remove(runnerId);
      if (runner != null) {
        logger.info("Removed headless runner: " + runnerId);
        runningInstances.notifyAll();
        return true;
      }
      return false;
    }
  }

  @Override
  public boolean hasRunner(String runnerId) {
    return runningInstances.containsKey(runnerId);
  }

  @Override
  public int getRunningCount() {
    return runningInstances.size();
  }

  @Override
  public void setProcess(String runnerId, Object process) {
    HeadlessRunner runner = runningInstances.get(runnerId);
    if (runner != null && process instanceof Process) {
      runner.setProcess((Process) process);
      logger.info("Set process for runner: " + runnerId);
    }
  }

  @Override
  public void cleanup() {
    synchronized (runningInstances) {
      // Remove completed processes
      boolean removed = runningInstances.entrySet().removeIf(entry -> {
        Process process = entry.getValue().getProcess();
        if (process != null && !process.isAlive()) {
          logger.info("Cleaning up completed runner: " + entry.getKey());
          return true;
        }
        return false;
      });
      
      if (removed) {
        runningInstances.notifyAll();
      }
    }
  }

  public HeadlessRunner getRunner(String runnerId) {
    return runningInstances.get(runnerId);
  }

  public boolean waitForRunnerRemoval(String runnerId, long timeout, TimeUnit unit) {
    synchronized (runningInstances) {
      if (!hasRunner(runnerId)) {
        logger.info("Runner " + runnerId + " already removed");
        return true;
      }
      
      try {
        runningInstances.wait(unit.toMillis(timeout));
        boolean removed = !hasRunner(runnerId);
        if (removed) {
          logger.info("Runner " + runnerId + " has been removed");
        } else {
          logger.warning("Timeout waiting for runner removal: " + runnerId);
        }
        return removed;
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        logger.warning("Wait for runner removal interrupted: " + runnerId);
        return false;
      }
    }
  }
}