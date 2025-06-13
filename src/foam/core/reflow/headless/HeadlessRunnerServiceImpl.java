/**
 * @license
 * Copyright 2024 The FOAM Authors. All Rights Reserved.
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

public class HeadlessRunnerServiceImpl extends ContextAwareSupport implements HeadlessRunnerService {

  private Logger logger = null;
  private final Map<String, HeadlessRunner> runningInstances = new ConcurrentHashMap<>();

  public HeadlessRunnerServiceImpl(X x) {
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
    HeadlessRunner runner = runningInstances.remove(runnerId);
    if (runner != null) {
      logger.info("Removed headless runner: " + runnerId);
      return true;
    }
    return false;
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
    // Remove completed processes
    runningInstances.entrySet().removeIf(entry -> {
      Process process = entry.getValue().getProcess();
      if (process != null && !process.isAlive()) {
        logger.info("Cleaning up completed runner: " + entry.getKey());
        return true;
      }
      return false;
    });
  }

  public HeadlessRunner getRunner(String runnerId) {
    return runningInstances.get(runnerId);
  }
}