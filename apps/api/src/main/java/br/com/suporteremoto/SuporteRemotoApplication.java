package br.com.suporteremoto;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SuporteRemotoApplication {
    public static void main(String[] args) {
        SpringApplication.run(SuporteRemotoApplication.class, args);
    }
}
