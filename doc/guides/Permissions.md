# FOAM Permissions

## Overview

Permissions in FOAM represent access to system resources and follow Java's hierarchical naming convention. [1](#1-0)  The system uses wildcard matching where an asterisk can appear by itself or at the end of a name preceded by a dot to signify wildcard matches.

## Permission Naming Convention

**Valid wildcard patterns:**
- `*` - Global permission (ability to do anything)
- `java.*` - Hierarchical wildcard

**Invalid patterns:**
- `*java`, `a*b`, `java*` - Asterisk not at end or not preceded by dot

**Examples:**
- `*` - Ability to do anything, granted to 'admin' group
- `userDAO.read.*` - Ability to read all Users from the UserDAO
- `themeDAO.write.acme` - Ability to write only the 'acme' Theme from the ThemeDAO

## Permission Checking

### Primary Interface
```
boolean foam.core.auth.AuthService.check(X x, String permission)
```

### Main Implementation
`UserAndGroupAuthService` serves as the primary implementation, decorated with multiple service layers:

- **CapabilityAuthService** - CRUNCH capability integration
- **EnabledCheckAuthService** - User enabled status validation
- **PasswordExpiryAuthService** - Password expiration checks
- **TwoFactoryAuthService** - Two-factor authentication
- **ResetSpidBeforeLoginAuthService** - Service provider context reset
- **CachingAuthService** - ⚠️ **Critical for performance**
- **SubjectAuthService** - Subject context management
- **PMAuthService** - Performance monitoring
- **SystemAuthService** - System-level permissions
- **FailedLoginAuthService** - Failed login attempt tracking

## Core Data Models

### Authentication Models
- **User** - System users (humans or computer systems) [2](#1-1)
- **Group** - User collections; each user belongs to one group [3](#1-2)
- **Permission** - Documented permissions shown in Permission Matrix [4](#1-3)
- **GroupPermissionJunction** - Many-to-many Group↔Permission relationship [5](#1-4)

### CRUNCH Models
- **Capability** - User-owned "contracts" that grant permissions, can expire, hierarchical [6](#1-5)
- **UserCapabilityJunction** - Many-to-many User↔Capability relationship

## Permission Patterns

### 1. Service Access
- **Pattern:** `service.<serviceName>`
- **Example:** `service.userDAO`
- **Implementer:** CSpec.js
- **Note:** Grants connection access but not operational permissions

### 2. WebAgent Execution
- **Pattern:** `service.run.<serviceName>`
- **Examples:** `service.run.Health`, `service.run.uptime`
- **Implementer:** NanoRouter.java
- **Note:** Separate from service access (probably a mistake)

### 3. DAO Object Operations
- **Pattern:** `<permissionPrefix>.<operation>.<id>`
  - `permissionPrefix = toLowerCase(model.name)`
  - Operations: `read`, `remove`, `create`, `update`
- **Examples:** `menu.read.settings`, `email.create`, `notificationsetting.remove.*`
- **Implementer:** `foam.core.auth.AuthorizationDAO`, `foam.core.auth.StandardAuthorizer` [7](#1-6)
- **Notes:**
  - `create` operations don't include `<id>`
  - ~50% of all permissions follow the `<prefix>.read.<id>` pattern
  - Alternative authorizers available: `AuthorizableAuthorizer`, `GlobalCreateAuthorizer`, etc.

### 4. Property-Level Access
- **Pattern:** `<modelName>.<ro|rw>.<propertyName>`
- **Examples:** `theme.rw.loginimage`, `user.ro.compliance`
- **Implementer:** `AbstractPropertyInfo.java`, `PermissionedPropertyDAO.js` [8](#1-7)
- **Configuration:** Must be explicitly enabled in model:
  ```javascript
  writePermissionRequired: true
  readPermissionRequired: true
  updatePermissionRequired: true
  ```

### 5. Action Permissions
- **Pattern:** No standardized pattern
- **Examples:**
  - `availablePermissions: ['command.read.test']`
  - `availablePermissions: ['foam.core.alarming.Alarm.rw.start']`
  - `availablePermissions: ['user.action.delete']`
- **Implementer:** Action.js
- **Note:** Defined within individual action models

### 6. UI Section Visibility
- **Pattern:** `<modelname.toLowerCase()>.section.<sectionName>`
- **Example:** `foam.core.cron.schedulable.section.history`
- **Implementer:** Unknown/undocumented
- **Status:** Implementation location not identified

### 7. Table Column Visibility
- **Pattern:** `<model>.column.<property>`
- **Example:** `approvalrequest.column.approver`
- **Implementer:** UnstyledTableView.js:567-573
- **Configuration:** `columnPermissionRequired: true`
- **Note:** Distinct from general property access permissions; controls table/grid view visibility only

## Permission Pattern Summary

| Pattern | Purpose |
|---------|---------|
| `service.<serviceName>` | Service access |
| `service.run.<serviceName>` | WebAgent execution |
| `<model>.read.<id>` | Read object |
| `<model>.remove.<id>` | Delete object |
| `<model>.create` | Create object |
| `<model>.ro.<property>` | Read property |
| `<model>.rw.<property>` | Write property |
| `<model>.column.<property>` | View table column |
| **No standard pattern** | Execute actions |

## User Interface

### Permission Management
- **PermissionMatrix** - Primary permission management interface [9](#1-8)
- **Security Principle:** Users cannot grant permissions they don't possess (implicitly or explicitly)

## Notes

The FOAM permission system implements a comprehensive authorization framework with wildcard support, hierarchical naming, and multiple specialized authorizers. [10](#1-9)  The system integrates with both traditional group-based permissions and the advanced CRUNCH capability system for fine-grained access control.

Wiki pages you might want to explore:
- [Advanced Features and Extensions (kgrgreer/foam3)](/wiki/kgrgreer/foam3#7)

### Citations

**File:** src/foam/core/auth/Permission.js (L7-24)
```javascript
 foam.CLASS({
   package: 'foam.core.auth',
   name: 'Permission',

   documentation: 'A permission represents access to system resources.',

   properties: [
     {
       class: 'String',
       name: 'id',
       tableWidth: 400
     },
     {
       class: 'String',
       name: 'description',
       documentation: 'Description of the Group.'
     }
   ],
```

**File:** src/foam/core/auth/pom.js (L16-16)
```javascript
    { name: "User",                                                   flags: "js|java" },
```

**File:** src/foam/core/auth/pom.js (L67-67)
```javascript
    { name: "Group",                                                  flags: "js|java" },
```

**File:** src/foam/core/auth/Relationships.js (L7-14)
```javascript
foam.RELATIONSHIP({
  cardinality: '*:*',
  sourceModel: 'foam.core.auth.Group',
  targetModel: 'foam.core.auth.Permission',
  forwardName: 'permissions',
  inverseName: 'groups',
  junctionDAOKey: 'groupPermissionJunctionDAO'
});
```

**File:** src/foam/core/crunch/Capability.js (L7-14)
```javascript
foam.CLASS({
  package: 'foam.core.crunch',
  name: 'Capability',

  implements: [
    // See CapabilityRefinement for additional implements
    'foam.core.auth.LifecycleAware'
  ],
```

**File:** src/foam/core/auth/AuthorizableAuthorizer.java (L14-44)
```java
public class AuthorizableAuthorizer implements Authorizer {

  protected String permissionPrefix_;

  public AuthorizableAuthorizer(String permissionPrefix) {
    permissionPrefix_ = permissionPrefix;
  }

  public void authorizeOnCreate(X x, FObject obj) throws AuthorizationException {
    if ( obj instanceof Authorizable ) {
      ((Authorizable) obj).authorizeOnCreate(x);
    }
  }

  public void authorizeOnRead(X x, FObject obj) throws AuthorizationException {
    if ( obj instanceof Authorizable ) {
      ((Authorizable) obj).authorizeOnRead(x);
    }
  }

  public void authorizeOnUpdate(X x, FObject oldObj, FObject obj) throws AuthorizationException {
    if ( obj instanceof Authorizable ) {
      ((Authorizable) obj).authorizeOnUpdate(x, oldObj);
    }
  }

  public void authorizeOnDelete(X x, FObject obj) throws AuthorizationException {
    if ( obj instanceof Authorizable ) {
      ((Authorizable) obj).authorizeOnDelete(x);
    }
  }
```

**File:** src/foam/lib/PermissionedPropertyPredicate.js (L22-28)
```javascript
        if ( prop.getReadPermissionRequired() ) {
          String      propName = prop.getName().toLowerCase();
          AuthService auth     = (AuthService) x.get("auth");

          return ( auth != null )
            ? (auth.check(x,  of + ".ro." + propName) || auth.check(x,  of + ".rw." + propName))
            : false;
```

**File:** src/foam/core/auth/PermissionTableView.js (L13-39)
```javascript
foam.CLASS({
  package: 'foam.core.auth',
  name: 'PermissionTableView',
  extends: 'foam.u2.Controller',

  implements: [ 'foam.mlang.Expressions' ],

  requires: [
    'foam.graphics.ScrollCView',
    'foam.core.auth.Group',
    'foam.core.auth.GroupPermissionJunction',
    'foam.core.auth.Permission'
  ],

  imports: [
    'auth',
    'groupDAO',
    'groupPermissionJunctionDAO',
    'permissionDAO',
    'user'
  ],

  constants: {
    COLS: 26,
    ROWS: 17,
    ROLE_PREFIX: 'Role'
  },
```

**File:** src/permissions.jrl (L1-10)
```text
p({"class":"foam.core.auth.Permission","id":"*","description":"Do anything global permission."})
p({"class":"foam.core.auth.Permission","id":"menu.auth","description":"Perform authentication related configuration"})
p({"class":"foam.core.auth.Permission","id":"service.*","description":"Global permission for reading of services"})
p({"class":"foam.core.auth.Permission","id":"service.read.*","description":"Global permission for reading of services from a DAO"})
p({"class":"foam.core.auth.Permission","id":"service.auth.checkUser","description":"Permission to grant access to check user permissions."})
p({"class":"foam.core.auth.Permission","id":"emailmessage.read.*","description":""})
p({"class":"foam.core.auth.Permission","id":"smsmessage.read.*","description":""})
p({"class":"foam.core.auth.Permission","id":"menu.read.admin","description":"Ability to use the 'admin' menu."})
p({"class":"foam.core.auth.Permission","id":"menu.read.admin.send-notification","description":"Ability to use Send Notification UI"})
p({"class":"foam.core.auth.Permission","id":"menu.read.admin.customise-theme","description":"Ability to use Theme Customisation UI"})
```
Permissions (from Java):

"Permissions represent access to a system resource."

"The naming convention follows the hierarchical property naming convention. An asterisk may appear by itself, or if immediately preceded by a "." may appear at the end of the name, to signify a wildcard match. For example, "*" and "java.*" signify a wildcard match, while "*java", "a*b", and "java*" do not."

Examples:
  *                   - ability to do anything, granted to 'admin'
  userDAO.read.*      - ability to read all Users from the UserDAO
  themeDAO.write.acme - ability to write only the 'acme' Theme from the ThemeDAO

See:
  https://docs.oracle.com/javase/8/docs/api/java/security/Permission.html
  https://docs.oracle.com/javase/8/docs/api/java/security/BasicPermission.html


Check Permissions with:
  boolean foam.core.auth.AuthService.check(X x, String permission)
  UserAndGroupAuthService is the main implementation

  But it is also decorated with:
     CapabilityAuthService
     EnabledCheckAuthService
     PasswordExpiryAuthService
     TwoFactoryAuthService
     ResetSpidBeforeLoginAuthService
     CachingAuthService               -- Very very important for performance
     SubjectAuthService
     PMAuthService
     SystemAuthService
     FailedLoginAuthService


Core Models:
  User - Users who can login to the system. Could be real users or other computer systems.
  Group - Groups of Users. Each user belongs to a single Group.
  Permission - A documented permission. A permission that is presented in the Permission Matrix.
  GroupPermissionJunction - Implements the many-to-many relationship between Groups and Permissions.

CRUNCH Models:
  Capability - A "contract" owned by a single user. Usually grants permissions. Can expire. Hierarchical.
  UserCapabilityJunction - Implements the many-to-many relationship between Users and and Capabilities.



Description: Ability to connect to a service
Implementer: CSpec.js
Pattern:     service.<serviceName>
Example(s):  service.userDAO
Notes:       Doesn't mean the service will actually let you do anything.



Description: Ability to run a WebAgent
Implementer: NanoRouter.java
Pattern:     service.run.<serviceName>
Example(s):  service.run.Health, service.run.uptime
Notes:       Why not just user service.<serviceName>? Probably a mistake.



Description: Ability to view or edit individual objects/rows in a DAO.
Implementer: foam.core.auth.AuthorizationDAO, foam.core.auth.StandardAuthorizer
Pattern:     <premissionPrefix.read/remove.<id>, <permissionPrefix>.create
             permissionPrefix = toLowerCase(model.name)
Example(s):  menu.read.settings, email.create, notificationsetting.remove.*
Notes:       'create' doesn't take an <id>
             About 50% of all permissions are of the <permissionPrefix>.read.<id> type.
             See also:
                 AuthorizableAuthorizer.java  - Let's the object implement its own auth policy
                 GlobalCreateAuthorizer.js - Let's any create, but otherwise extends StandardAuthorizer.
                 GlobalFindAuthorizer.java
                 GlobalFindOrPutAuthorizer.java
                 GlobalPutAuthorizer.java
                 GlobalReadAuthorizer.java



Description: Ability to view or edit individual Properties
Implementer: AbstractPropertyInfo.java, PermissionedPropertyDAO.js
Pattern:     <modelName>.ro/rw.<propertyName>
Example(s):  theme.rw.loginimage, user.ro.compliance
Notes:       Not enabled by default. Needs to be specified in Model file:
      writePermissionRequired:  true
      readPermissionRequired:   true
      updatePermissionRequired: true



Description: The ability to perform Actions
Implementer: Action.js
Pattern:     NO PATTERN
Example(s):
  availablePermissions: [ 'command.read.test' ],
  availablePermissions: [ 'foam.core.alarming.Alarm.rw.start' ],
  availablePermissions: [ 'user.action.delete' ],
Notes:       Defined in the actions: model.



Description: The ability to see SectionedDetailView Sections
Implementer: unknown
Pattern:     <modelname.toLowerCase()>.section.<sectionName>
Example(s):  foam.core.cron.schedulable.section.history
Notes:       I couldn't find where this is implemented



Description: The ability to see a Property as a TableView Column
Implementer: UnstyledTableView.js:567-573
Pattern:     <model>.column.<property>  (${this.of.name.toLowerCase()}.column.${p.name})
Example(s):  approvalrequest.column.approver
Notes:       Rarely used.
             This is distinct from readPermissionRequired and writePermissionRequired which control general property access - columnPermissionRequired specifically controls visibility in table/grid views. The property is defined as a refinement to the base Property class in the table view system UnstyledTableView.js:556-575 .
Usage:
             columnPermissionRequired: true



Summary:
  service.<serviceName>       Access a Service
  service.run.<serviceName>   Access a WebAgent
  <model>.read.<id>           Read a Row
  <model>.remove.<id>         Remove a Row
  <model>.create              Create a new Row
  <model>.ro.<property>       Read a Property
  <model>.rw.<property>       Update a Property
  <model>.column.<property>   View a Property a TableView Column
  ???                         There is not pattern for Actions


UI:
  PermissionMatrix
  FOAM does not let you grant permissions that you yourself don't have (implictly)
