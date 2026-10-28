@echo off
echo ==============================================
echo Iniciando Backend Spring Boot - Porta 8080
echo ==============================================
set JAVA_HOME=C:\Java\jdk-21
set PATH=C:\Java\jdk-21\bin;%PATH%
cd apps\api
mvn spring-boot:run
pause
