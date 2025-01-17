#!/bin/bash
# Super simple launcher.

APP_HOME=$(dirname $(dirname $0))
HOST_NAME=`hostname -s`
APP_NAME=foam
WEB_PORT=8080
NANOS_PIDFILE=/tmp/nanos.pid
export DEBUG=0
export DEBUG_SUSPEND=n
export DEBUG_PORT=8000

if [ -f "build/env.sh" ]; then
    source build/env.sh
fi

function usage {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options are:"
    echo "  -A <app_name>       : Application name and also prefix of jar file"
    echo "  -d                  : Debug enabled"
    echo "  -D [<port>]         : Debug enabled, suspend on lauch, on port (default 8000)"
    echo "  -N <hostname>       : hostname "
    echo "  -W <port>           : HTTP Port (default 8080)"
}

while getopts "A:dD:N:W:" opt ; do
    case $opt in
        A) APP_NAME=$OPTARG;;
        d) DEBUG=1;
           DEBUG_SUSPEND=y;;
        D) DEBUG=1;
           DEBUG_SUSPEND=y;
           if [ -n ${OPTARG} ]; then
               DEBUG_PORT=$OPTARG;
           fi;;
        N) HOST_NAME=$OPTARG;;
        W) WEB_PORT=$OPTARG;;
        ?) usage ; exit 0 ;;
   esac
done

echo "run.sh $APP_NAME @ $HOST_NAME:$WEB_PORT"

JAVA_OPTS=""
export JOURNAL_HOME="${APP_HOME}/journals"
export DOCUMENT_HOME="${APP_HOME}/documents"
export LOG_HOME="${APP_HOME}/logs"

# load instance specific deployment options
if [ -f "${APP_HOME}/etc/shrc.local" ]; then
    . "${APP_HOME}/etc/shrc.local"
fi

JAVA_OPTS="${JAVA_OPTS} -DAPP_HOME=${APP_HOME}"
JAVA_OPTS="${JAVA_OPTS} -Dresource.journals.dir=journals"
JAVA_OPTS="${JAVA_OPTS} -Dhostname=${HOST_NAME}"
if [ -z "`echo "${JAVA_OPTS}" | grep "http.port"`" ] && [ ! -z ${WEB_PORT} ]; then
    JAVA_OPTS="${JAVA_OPTS} -Dhttp.port=${WEB_PORT}"
fi
JAVA_OPTS="${JAVA_OPTS} -DJOURNAL_HOME=${JOURNAL_HOME}"
JAVA_OPTS="${JAVA_OPTS} -DDOCUMENT_HOME=${DOCUMENT_HOME}"
JAVA_OPTS="${JAVA_OPTS} -DLOG_HOME=${LOG_HOME}"

JAR=$(ls ${APP_HOME}/lib/${APP_NAME}-*.jar | awk '{print $1}')

export RES_JAR_HOME="${JAR}"

export JAVA_TOOL_OPTIONS="${JAVA_OPTS}"
echo ${JAVA_OPTS} > ${APP_HOME}/logs/opts.txt
echo JAVA_OPTS=${JAVA_OPTS}
java -server -jar "${JAR}"

exit 0
