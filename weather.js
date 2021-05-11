// Cloud hosts like Heroku or Azure, sets NODE_ENV to production and thus dotenv is not required in that case
// Otherwise we need to add it as a dependency and also need to push .env file which is a bad practice.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require("express");
const bp = require("body-parser");
const https = require("https");
// Importing azure (keyvault) dependencies
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
// Cloud hosts like Heroku or Azure, however, use the PORT variable to tell you on which port your server should listen for the routing to work properly
// Helpful read: https://docs.microsoft.com/en-us/azure/app-service/configure-language-nodejs
const PORT = process.env.PORT || 3000
// imp read: https://www.dynatrace.com/news/blog/the-drastic-effects-of-omitting-node-env-in-your-express-js-applications/
const app = express();
app.use(bp.urlencoded({extended:true}));

// Create Vault URL from App Settings
const vaultUrl = "https://" + process.env.VaultName + ".vault.azure.net/";
const credential = new DefaultAzureCredential();
const secClient = new SecretClient(vaultUrl, credential);

// Map of key vault secret names to values
let vaultSecretsMap = {};

// Utility function to get secret from given name
const getKeyVaultSecrets = async () => {
  // Create a key vault secret client
  let secretClient = new SecretClient(vaultUrl, new DefaultAzureCredential());
  try {
    // Iterate through each secret in the vault
    listPropertiesOfSecrets = secretClient.listPropertiesOfSecrets();
    while (true) {
      let { done, value } = await listPropertiesOfSecrets.next();
      if (done) {
        break;
      }
      // Only load enabled secrets - getSecret will return an error for disabled secrets
      if (value.enabled) {
        const secret = await secretClient.getSecret(value.name);
        vaultSecretsMap[value.name] = secret.value;
      }
    }
  } catch(err) {
    console.log(err.message)
  }
}

// home route - handle get request
app.get("/" , function (req,res) {
    console.log(API_KEY);
    console.log(JSON.stringify(vaultSecretsMap));
    res.write("API_KEY: " + API_KEY);
    res.write(JSON.stringify(vaultSecretsMap));
    res.sendFile(__dirname + "/index.html");
});

// home route - handle post request
app.post("/" , function (req,res) {
    var city = req.body.city;
    var url = "https://api.openweathermap.org/data/2.5/weather?q=" + city + "&appid=" + API_KEY + "&units=metric";
    console.log(weatherData);
    console.log(API_KEY);
    res.write("WeatherData: " + weatherData);
    res.write("API_KEY: " + API_KEY);
    https.get(url , function (response) {
        response.on("data" , function (data) {
            var weatherData = JSON.parse(data);
            console.log(weatherData);
            console.log(API_KEY);
            res.write("WeatherData: " + weatherData);
            res.write("API_KEY: " + API_KEY); 
            if (weatherData.cod != 200) {
                res.write('<h1> Sorry your Location is not Found! Try Again with another Location! </h1>');
                res.write("<form action=\"/\" method=\"get\">\n<input type=\"submit\" value=\"Go to Home\"\n />\n</form>");
//                 res.send();
            }
            else {
                var temp = weatherData.main.temp;
                var desc = weatherData.weather[0].description;
                var icon = weatherData.weather[0].icon;
                var imgUrl = "http://openweathermap.org/img/wn/" + icon + "@2x.png";
                res.write("<h1> Current Temperature in " + weatherData.name + " is : " + temp + " degree Celcius. </h1>");
                res.write("<h2> Description of the Current Weather : " + desc + ". </h2>");
                res.write("<img src = " + imgUrl + ">");
                res.write("<form action=\"/\" method=\"get\">\n<input type=\"submit\" value=\"Go to Home\"\n />\n</form>");
//                 res.send();
            }
        });
    });
    res.send();
});

// Utility function to get secret from given name
(async () =>  {
  // openweatherapi key
  await getKeyVaultSecrets();
  const secretName = 'API-KEY';
  const secret = await secClient.getSecret(secretName);
  const API_KEY = secret.value;
  // listen to PORT
  app.listen(PORT, function () {
      console.log("Server has started on localhost:" + PORT);
  });
})().catch(err => console.log(err));
