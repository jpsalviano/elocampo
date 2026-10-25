# syntax=docker/dockerfile:1
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
# Dependências numa camada própria: só refeita quando os arquivos de build mudam.
RUN ./gradlew --no-daemon -q dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon -q bootJar -x test

FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S -G app app && mkdir -p /data/files && chown -R app:app /data
COPY --from=build /src/build/libs/elocampo-api.jar /app/elocampo-api.jar
USER app
# Heap pequeno para um contêiner pequeno; headless para as imagens geradas da demonstração.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -Djava.awt.headless=true"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/elocampo-api.jar"]
