FROM tomcat:10.1-jre17-temurin
ARG OPENOLAT_WAR_URL
ARG OPENOLAT_WAR_SHA256
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip python3 && rm -rf /var/lib/apt/lists/*
RUN test -n "$OPENOLAT_WAR_SHA256" && curl --fail --location --proto '=https' "$OPENOLAT_WAR_URL" -o /tmp/openolat.war \
 && echo "$OPENOLAT_WAR_SHA256  /tmp/openolat.war" | sha256sum -c - \
 && mkdir -p /usr/local/tomcat/webapps/ROOT \
 && unzip -q /tmp/openolat.war -d /usr/local/tomcat/webapps/ROOT \
 && rm /tmp/openolat.war
COPY configure.py /opt/configure.py
RUN useradd --uid 10002 --create-home openolat && mkdir -p /data/openolat && chown -R openolat /data /usr/local/tomcat
USER openolat
CMD ["sh", "-c", "python3 /opt/configure.py && exec catalina.sh run"]
