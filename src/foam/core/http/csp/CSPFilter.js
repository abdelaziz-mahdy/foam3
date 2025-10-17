/**
 * @license
 * Copyright 2023 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.http.csp',
  name: 'CSPFilter',

  documentation: `Content-Security-Policy servlet filter.
Attempts to find a 'domain' specific policy via ThemeDomain,
falling back to the CONTENT_SECURITY_POLICY defined in CSpec "http".
`,

  javaImplements: [ 'jakarta.servlet.Filter' ],

  javaImports: [
    'foam.core.theme.ThemeDomain',
    'foam.dao.AbstractSink',
    'foam.dao.DAO',
    'foam.lang.Detachable',
    'foam.lang.X',
    'foam.lang.XLocator',
    'static foam.mlang.MLang.AND',
    'static foam.mlang.MLang.EQ',
    'foam.mlang.predicate.Predicate',
    'foam.util.SafetyUtil',
    'jakarta.servlet.*',
    'jakarta.servlet.http.HttpServletResponse',
    'java.util.concurrent.ConcurrentHashMap',
    'java.util.Map'
  ],

  properties: [
    {
      name: 'defaultCSP',
      class: 'String',
      visibility: 'HIDDEN'
    },
    {
      name: 'cache',
      class: 'Map',
      javaFactory: 'return new ConcurrentHashMap();',
      visibility: 'HIDDEN'
    }
  ],

  methods: [
    {
      name: 'init',
      args: 'FilterConfig config',
      javaThrows: [ 'ServletException' ],
      javaCode: `
        setDefaultCSP(config.getInitParameter("CONTENT_SECURITY_POLICY"));

        X x = (X) config.getServletContext().getAttribute("X");
        DAO themeDomainDAO = (DAO) x.get("themeDomainDAO");
        themeDomainDAO.listen(new AbstractSink() {
          @Override
          public void put(Object obj, Detachable sub) {
            getCache().clear();
          }
        }, null);

        DAO cspDAO = (DAO) x.get("cspDAO");
        cspDAO.listen(new AbstractSink() {
          @Override
          public void put(Object obj, Detachable sub) {
            getCache().clear();
          }
        }, null);
      `
    },
    {
      name: 'doFilter',
      args: 'ServletRequest request, ServletResponse response, FilterChain chain',
      javaThrows: [ 'java.io.IOException', 'ServletException' ],
      javaCode: `
        String name = request.getServerName();
        String domain = name;
        String subDomain = null;
        String[] parts = domain.split(".");
        if ( parts.length > 1 ) {
          subDomain = parts[0];
          domain = parts[1];
        }
        String policy = (String) getCache().get(name);
        if ( SafetyUtil.isEmpty(policy) ) {
          policy = getDefaultCSP();

          X x = (X) request.getServletContext().getAttribute("X");
          if ( x != null ) {
            DAO themeDomainDAO = (DAO) x.get("themeDomainDAO");
            if ( themeDomainDAO != null ) {
              Predicate pred = EQ(ThemeDomain.ID, domain);
              if ( ! SafetyUtil.isEmpty(subDomain) ) {
                pred = AND(pred, EQ(ThemeDomain.SUBDOMAIN, subDomain));
              }
              ThemeDomain themeDomain = (ThemeDomain) themeDomainDAO.find(pred);
              if ( themeDomain != null &&
                   ! SafetyUtil.isEmpty(themeDomain.getContentSecurityPolicy()) ) {
                DAO cspDAO = (DAO) x.get("cspDAO");
                CSP csp = (CSP) cspDAO.find(themeDomain.getContentSecurityPolicy());
                if ( csp != null &&
                     ! SafetyUtil.isEmpty(csp.getPolicy()) ) {
                  foam.core.logger.StdoutLogger.instance().info("CSPFilter,doFilter,found domain policy for", name);
                  policy = csp.getPolicy();
                  policy = policy.replaceAll("\\n", "");
                }
              }
            }
          }
          getCache().put(name, policy);
        }

        if ( ! SafetyUtil.isEmpty(policy) ) {
          ((HttpServletResponse) response).setHeader("Content-Security-Policy", policy);
        }

        chain.doFilter(request, response);
      `
    },
    {
      name: 'destroy',
      javaCode: '// noop'
    }
  ]
});
