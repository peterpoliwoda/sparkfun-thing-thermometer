/********************************************************************/
// First we include the libraries
#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
/********************************************************************/
// Data wire is plugged into pin 16 on the Arduino 
#define ONE_WIRE_BUS 16
/********************************************************************/
// Setup a oneWire instance to communicate with any OneWire devices
// (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);
/********************************************************************/
// Pass our oneWire reference to Dallas Temperature. 
DallasTemperature sensors(&oneWire);
/********************************************************************/ 

/* CONFIG */
// WiFi network name and password:
const char * networkName = "YOUR-WIFI-SSID";
const char * networkPswd = "YOUR-WIFI-PASSWORD";
// Send to RaspberryPi server on your local network:
IPAddress hostDomain(192,168,1,3);
// Or use below to replace with domain name somewhere on the Intenet
// const char * hostDomain = "peterpoliwoda.me";

const int hostPort = 5000;
const char * path = "/temperature/";

const int LED_PIN = 5;

void setup(void) {
 // start serial port
 Serial.begin(9600);
 pinMode(LED_PIN, OUTPUT);

 Serial.println("# ChasedByPenguins : Sparkfun Temperature Sensor");
 // Start up the library
 sensors.begin();


 // Connect to the WiFi network (see function below loop)
 connectToWiFi(networkName, networkPswd);

 digitalWrite(LED_PIN, LOW); // LED off
}

void loop(void) {
  float temp = getTemperature();
  postTemperatureToPi(temp);
  delay(60000);
}

float getTemperature() {
 // call sensors.requestTemperatures() to issue a global temperature
 // request to all devices on the bus
/********************************************************************/
 Serial.print(" Requesting temperatures...");
 sensors.requestTemperatures(); // Send the command to get temperature readings
 Serial.println("DONE");
/********************************************************************/

 float temp = sensors.getTempCByIndex(0);
 Serial.print("Temperature is: ");
 Serial.print(temp); // Why "byIndex"?
 Serial.println();
 // You can have more than one DS18B20 on the same bus.
 // 0 refers to the first IC on the wire
 blinkTimes(2);
 return temp;
}

void connectToWiFi(const char * ssid, const char * pwd) {
  int ledState = 0;

  Serial.println("Connecting to WiFi network: " + String(ssid));

  WiFi.begin(ssid, pwd);

  while (WiFi.status() != WL_CONNECTED) {
    // Blink LED while we're connecting:
    digitalWrite(LED_PIN, ledState);
    ledState = (ledState + 1) % 2; // Flip ledState
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  blinkTimes(1);
}

void blinkTimes(int times) {
 int i;
 for (i=0; i<times; i++) {
  digitalWrite(LED_PIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(500);                       // wait for a second
  digitalWrite(LED_PIN, LOW);    // turn the LED off by making the voltage LOW
  delay(500);                       // wait for a second
 }
}

void postTemperatureToPi(float temperature) {
  Serial.println("Connecting to domain: " + String(hostDomain));

  // Use WiFiClient class to create TCP connections
  WiFiClient client;
  if (!client.connect(hostDomain, hostPort)) {
    Serial.println("connection failed");
    return;
  }
  Serial.println("Connected!");
  Serial.println("Sending request temp to " + String(path) + String(temperature)); 
  // This will send the request to the server
  client.print((String)"POST " + String(path) + String(temperature) + " HTTP/1.1\r\n" +
               "Host: " + String(hostDomain) + ":" + String(hostPort) + "\r\n" +
               "Accept: application/json \r\n" +
               "Content-Type: application/x-www-form-urlencoded\r\n" + 
               "Connection: close\r\n\r\n");
  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 5000) 
    {
      Serial.println(">>> Client Timeout !");
      client.stop();
      return;
    }
  }

  // Read all the lines of the reply from server and print them to Serial
  while (client.available()) {
    String line = client.readStringUntil('\r');
    Serial.print(line);
  }

  Serial.println();
  Serial.println("closing connection");
  client.stop();
  blinkTimes(3);
}

