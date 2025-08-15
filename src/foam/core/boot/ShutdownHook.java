/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Java shutdown hook to allow for graceful stopping of services
 */
package foam.core.boot;

import foam.core.app.AppConfig;
import foam.core.logger.Logger;
import foam.core.logger.Loggers;
import foam.lang.X;
import java.util.Map;
import java.io.*;
import java.nio.file.FileSystems;

public class ShutdownHook
  extends Thread {

  protected X x_;
  protected Map<String, CSpecFactory> factories_ = null;

  public ShutdownHook(X x, Map factories) {
    x_ = x;
    factories_ = factories;

    Runtime.getRuntime().addShutdownHook(this);
    Loggers.logger(x).info("Shutdownhook,registered");
  }

  @Override
  public void run() {
    Logger logger = Loggers.logger(x_);
    logger.info("Shutdownhook,shutdown requested");

    if ( factories_ != null ) {
      for ( CSpecFactory factory : factories_.values() ) {
        // Report factory shutdown to troubleshoot services not stoppinp
        logger.debug("Shutdownhook,shutdown,factory",factory.getCSpecName(),"start");
        factory.shutdown();
        logger.debug("Shutdownhook,shutdown,factory",factory.getCSpecName(),"end");
      }
    }

    logger.info("ShutdownHook,shutdown complete");

    // Generate a thrump dump to help troubleshoot system shutdown issues
    try {
      foam.core.http.ThreadsWebAgent agent = new foam.core.http.ThreadsWebAgent();
      String tmp = System.getProperty("java.io.tmpdir", FileSystems.getDefault().getSeparator() + "tmp" + FileSystems.getDefault().getSeparator());
      AppConfig appConfig = (AppConfig) x_.get("appConfig");
      String appName = appConfig.getName().trim().replaceAll(" ","");
      String hostname = System.getProperty("hostname", "localhost");
      if ( hostname.equals("localhost") ) {
        hostname = System.getProperty("user.name", "localhost");
      }
      String fileName = tmp + hostname + FileSystems.getDefault().getSeparator() + appName + FileSystems.getDefault().getSeparator() + "threaddump.html";
      FileWriter fw = new FileWriter(fileName);
      PrintWriter pw = new PrintWriter(fw);
      X y = x_.put(PrintWriter.class, pw);
      agent.execute(y);
      fw.flush();
      logger.info("ShutdownHook,shutdown,Thread report", fileName);
    } catch (Throwable t) {
      logger.warning("ShutdownHook,shutdown,Failed to generated thread report", t);
    }
  }
}
