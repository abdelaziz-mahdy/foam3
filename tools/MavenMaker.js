/**
 * @license
 * Copyright 2023 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// MavenMaker

exports.description = 'build a Maven pom.xml from javaDependencies, call maven if pom.xml updated';

exports.args = [
  {
    name: 'repo',
    description: 'maven repository',
    value: 'http://repo.maven.apache.org/maven2/'
  },
  {
    name: 'javaRelease',
    description: 'Java version to target',
    value: 17
  }
];

const path_                                                          = require('path');
const { execSync, ensureDir, adaptOrCreateArgs, writeFileIfUpdated, isExcluded } = require('./buildlib');

const javaDependencies = [];

exports.init = function() {
  adaptOrCreateArgs(X, exports.args);
  X.libdir = X.builddir + '/lib';
  X.javasourcedirs = [];
}


exports.visitPOM = function(pom) {
  pom.javaDependencies && pom.javaDependencies.forEach(d => javaDependencies.push([d, pom.path]));
  if ( pom.javaSourceRoot ) {
    X.javasourcedirs.push(pom.location)
  }
}


exports.end = function() {
  // Build Maven file
  ensureDir(X.libdir);
  var pom = foam.poms[0];

  var versions     = {};
  var conflicts    = [];
  var dependencies = javaDependencies.map(d => {
    var [id, ...excludes] = d[0].split(' ');
    var [groupId, artifactId, version] = id.split(':');

    // Detect libs version conflict
    var lib = groupId + ':' + artifactId;
    versions[lib] = [...(versions[lib] || []), { id, loc: d[1] }];
    // mark as conflicted if a different version found
    if ( versions[lib].length == 2 && versions[lib][0].id === id ) {
      versions[lib].pop();
      // dependency already added to pom.xml
      return;
    }
    if ( versions[lib].length == 2 ) conflicts.push(lib);

    // Dependency exclusions
    var exclusions = '';
    excludes.forEach(e => {
      if ( e.startsWith('-') ) {
        const [groupId, artifactId] = e.slice(1).split(':');
        exclusions += `
          <exclusion>
            <groupId>${groupId}</groupId>
            <artifactId>${artifactId || '*'}</artifactId>
          </exclusion>\n`;
      }
    });

    return `
      <!-- Source: ${d[1]} -->
      <dependency>
        <groupId>${groupId}</groupId>
        <artifactId>${artifactId}</artifactId>
        <version>${version}</version>
        <exclusions>${exclusions}</exclusions>
      </dependency>\n`;
  }).join('');

  // Print versions conflict info and abort
  if ( conflicts.length > 0 ) {
    console.log('[Maven] Detected libs version conflict:');
    var info = '';
    conflicts.forEach(c => {
      info += '\t' + c + '\n' +
        versions[c].map(d => '\t\t' + d['id'] + ' at ' + d['loc']).join('\n') + '\n';
    });
    console.log(info);
    throw new Error('Abort [Maven Builder] due to library versions conflict detected.');
  }

  var pomxml = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${pom.vendorId || pom.name}</groupId>
    <artifactId>${pom.name}</artifactId>
    <version>${pom.version}</version>

    <properties>
      <maven.compiler.source>${X.javaRelease}</maven.compiler.source>
      <maven.compiler.target>${X.javaRelease}</maven.compiler.target>
    </properties>

    <build>
      <directory>${X.builddir}</directory>
      <sourceDirectory>${X.outdir}</sourceDirectory>
      <plugins>
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-compiler-plugin</artifactId>
          <version>3.13.0</version>
          <configuration>
            <showCompilationChanges>true</showCompilationChanges>
          </configuration>
        </plugin>
        <plugin>
          <groupId>org.codehaus.mojo</groupId>
          <artifactId>build-helper-maven-plugin</artifactId>
          <version>3.6.0</version>
          <executions>
            <execution>
              <id>add-source</id>
              <phase>generate-sources</phase>
              <goals>
                <goal>add-source</goal>
              </goals>
              <configuration>
                <sources>
                  ${X.javasourcedirs.map(d => `<source>${d}</source>`).join('\n                  ')}
                </sources>
              </configuration>
            </execution>
          </executions>
        </plugin>
        <plugin>
          <groupId>org.owasp</groupId>
          <artifactId>dependency-check-maven</artifactId>
          <version>8.3.1</version>
          <configuration>
            <assemblyAnalyzerEnabled>false</assemblyAnalyzerEnabled>
          </configuration>
          <executions>
            <execution>
              <goals>
                <goal>check</goal>
              </goals>
            </execution>
          </executions>
        </plugin>
      </plugins>
    </build>

    <dependencies>${dependencies}    </dependencies>
  </project>\n`.replaceAll(/^  /gm, '');

  if ( writeFileIfUpdated('pom.xml', pomxml) ) {
    console.log('[Maven] Updating pom.xml with', javaDependencies.length, 'dependencies.');
    execSync(`mvn dependency:copy-dependencies -DoutputDirectory=${X.builddir + '/lib'}`, { stdio: 'inherit' });
  } else {
    console.log('[Maven] Not Updating pom.xml. No changes to', javaDependencies.length, 'dependencies.');
  }
}
