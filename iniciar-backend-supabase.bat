@echo off
echo ============================================================
echo   Iniciando Backend Spring Boot conectado ao Supabase
echo ============================================================
set JAVA_HOME=C:\Java\jdk-21
set PATH=C:\Java\jdk-21\bin;%PATH%
set SPRING_PROFILES_ACTIVE=supabase
set SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require^&prepareThreshold=0
set SPRING_DATASOURCE_USERNAME=postgres.onqxaoxrukbrkkdyyatj
set SPRING_DATASOURCE_PASSWORD=Wallans019'dan

cd apps\api
mvn spring-boot:run
pause
