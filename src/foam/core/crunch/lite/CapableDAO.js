/**
 * @license
 * Copyright 2020 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.crunch.lite',
  name: 'CapableDAO',
  extends: 'foam.dao.ProxyDAO',

  javaImports: [
    'foam.lang.FObject',
    'foam.dao.ArraySink',
    'foam.dao.ProxySink',
    'foam.dao.DAO',
    'foam.util.SafetyUtil',
    'foam.core.crunch.CapabilityIntercept',
    'foam.core.crunch.lite.Capable',
    'foam.core.crunch.CapabilityJunctionPayload',
    'foam.core.crunch.Capability',
    'foam.core.crunch.CapabilityJunctionStatus',
    'java.util.Arrays',
    'java.util.ArrayList',
    'java.util.List'
  ],

  properties: [
    {
      class: 'String',
      name: 'daoKey'
    },
    {
      class: 'Enum',
      name: 'defaultStatus',
      of: 'foam.core.crunch.CapabilityJunctionStatus',
      value: foam.core.crunch.CapabilityJunctionStatus.ACTION_REQUIRED
    },
    {
      class: 'Boolean',
      name: 'allowActionRequiredPuts'
    }
  ],

  methods: [
    {
      name: 'find_',
      javaCode: `
        Capable capable = (Capable) getDelegate().find_(x, id);
        if ( capable == null ) {
          return null;
        }
        capable = (Capable) ((FObject) capable).fclone();

        capable = populatePayloads(x, capable);

        return (FObject) capable;
      `
    },
    {
      name: 'select_',
      javaCode: `
        if (sink != null) {
          ProxySink refinedSink = new ProxySink(x, sink) {
            @Override
            public void put(Object obj, foam.lang.Detachable sub) {
              Capable capable = (Capable) ((FObject) obj).fclone();

              capable = populatePayloads(x, capable);

              super.put(capable, sub);
            }
          };
          return ((ProxySink) super.select_(x, refinedSink, skip, limit, order, predicate)).getDelegate();
        }
        return super.select_(x, sink, skip, limit, order, predicate);
      `
    },
    {
      name: 'populatePayloads',
      args: [
        { name: 'x', javaType: 'foam.lang.X' },
        { name: 'capable', javaType: 'Capable' }
      ],
      type: 'Capable',
      javaCode:`
        DAO capablePayloadDAO = capable.getCapablePayloadDAO(x);
        CapabilityJunctionPayload[] payloads = (CapabilityJunctionPayload[]) ((List) ((ArraySink) capablePayloadDAO.select(new ArraySink())).getArray()).toArray(new CapabilityJunctionPayload[0]);
        capable.setCapablePayloads(payloads);
        return capable;
      `
    },
    {
      name: 'put_',
      javaCode: `
        FObject currentObjectInDao = getDelegate().find_(x, obj);
        Capable toPutCapableObj =  (Capable) obj;
        DAO toUpdateCapablePayloadDAO;

        CapabilityJunctionPayload[] toPutCapablePayloadArray =
          (CapabilityJunctionPayload[]) toPutCapableObj.getCapablePayloads();

        // For both create and update,
        // we need to handle the cleaning of data if it is from the client
        // and we also need to populate the CapablePayload.daoKey and
        // CapablePayload.objId fields since they don't get filled out by client
        if ( currentObjectInDao == null ) {
          toUpdateCapablePayloadDAO = toPutCapableObj.getCapablePayloadDAO(getX());
          for (int i = 0; i < toPutCapablePayloadArray.length; i++){

            toPutCapableObj.setDAOKey(getDaoKey());

            CapabilityJunctionPayload currentCapablePayload = toPutCapablePayloadArray[i];

            if ( ! currentCapablePayload.getHasSafeStatus() ){
              currentCapablePayload.setStatus(getDefaultStatus());
            }
          }
        } else {
          Capable storedCapableObj = (Capable) currentObjectInDao.fclone();

          toPutCapableObj.setDAOKey(storedCapableObj.getDAOKey());

          // should always be sync'd with whatever is on the backend
          if (
            SafetyUtil.isEmpty(String.valueOf(storedCapableObj.getDAOKey()))
          ) {
            toPutCapableObj.setDAOKey(getDaoKey());
          }

          toUpdateCapablePayloadDAO = storedCapableObj.getCapablePayloadDAO(getX());

          for ( int i = 0; i < toPutCapablePayloadArray.length; i++ ){
            CapabilityJunctionPayload toPutCapablePayload =
              (CapabilityJunctionPayload) toPutCapablePayloadArray[i];

            if ( ! toPutCapablePayload.getHasSafeStatus() ){

              DAO capabilityDAO = (DAO) x.get("capabilityDAO");
              Capability capability = (Capability) capabilityDAO.find(toPutCapablePayload.getCapability());

              if ( capability == null ) {
                throw new RuntimeException("capability not found: " +
                  toPutCapablePayload.getCapability());
              }

              CapabilityJunctionPayload storedCapablePayload = (CapabilityJunctionPayload) toUpdateCapablePayloadDAO.find(capability.getId());

              if ( storedCapablePayload != null ){
                toPutCapablePayload.setStatus(storedCapablePayload.getStatus());
              }
            }
          }
        }

        List<CapabilityJunctionPayload> capablePayloads = new ArrayList<CapabilityJunctionPayload>(Arrays.asList(toPutCapablePayloadArray));

        for ( CapabilityJunctionPayload currentPayload : capablePayloads ){
          toUpdateCapablePayloadDAO.inX(x).put(currentPayload);
        }

        // include old payloads when checking requirement status
        CapabilityJunctionPayload[] payloads = (CapabilityJunctionPayload[]) ((List) ((ArraySink) toUpdateCapablePayloadDAO.inX(getX()).select(new ArraySink())).getArray()).toArray(new CapabilityJunctionPayload[0]);
        toPutCapableObj.setCapablePayloads(payloads);

        if ( 
          ! toPutCapableObj.checkRequirementsStatusNoThrow(x, toPutCapableObj.getCapabilityIds(), CapabilityJunctionStatus.GRANTED) &&
          ! toPutCapableObj.checkRequirementsStatusNoThrow(x, toPutCapableObj.getCapabilityIds(), CapabilityJunctionStatus.PENDING) &&
          ! toPutCapableObj.checkRequirementsStatusNoThrow(x, toPutCapableObj.getCapabilityIds(), CapabilityJunctionStatus.REJECTED) &&
          ! getAllowActionRequiredPuts()
        ) {
          CapabilityIntercept cre = new CapabilityIntercept();
          cre.setDaoKey(getDaoKey());
          cre.addCapable(toPutCapableObj);
          throw cre;
        }

        return super.put_(x, obj);
      `
    }
  ],
});
