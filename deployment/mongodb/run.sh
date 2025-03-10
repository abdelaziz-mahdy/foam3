#!/bin/bash
node tools/build.js -Ppom,src/foam/dao/mongodb/pom-all -Jmongodb "$@"
