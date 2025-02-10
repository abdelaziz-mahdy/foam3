#!/bin/bash
echo "If this doesn't work, do: git reset --hard; cd foam3; git reset --hard"
echo "Good luck!"

find ./ -type f \( \
     -name "*.js"   -o \
     -name "*.java" -o \
     -name "*.jrl"  -o \
     -name "*.fbe"  -o \
     -name "*.sh"   -o \
     -name "*.flow" -o \
     -name "*.txt"  -o \
     -name "*.html" -o \
     -name "*.md" \) \
   -exec perl -p -i -e 's/foam\.core/foam\.lang/g' \{} \; \
   -exec perl -p -i -e 's/foam\/core/foam\/lang/g' \{} \; \
   -exec perl -p -i -e 's/NSpec/COREService/g'   \{} \; \
   -exec perl -p -i -e 's/nanos/core/g'          \{} \; \
   -exec perl -p -i -e 's/NANOS/CORE/g'          \{} \;

cd foam3/src/foam
git mv core  lang
git mv nanos core
