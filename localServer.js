const express = require("express");
const net = require("net");
const http = require("http");
const axios = require("axios"); // Import the axios library
const cors = require("cors");
const app = express();
const server = http.createServer(app);

app.use(cors());

// Initialize an array to store the data
const voltageData = [];
let idCounter = 0; // Initialize the ID counter

// Create a TCP server using the 'net' module
const tcpServer = net.createServer((socket) => {
  console.log("A client has connected.");

  // Buffer to accumulate incoming data
  let buffer = Buffer.from([]);
  let lastProcessedTime = 0; // Initialize the last processed time

  socket.on("data", (data) => {
    // Append incoming data to the buffer
    buffer = Buffer.concat([buffer, data]);

    // Check if the buffer contains at least 3 values
    while (buffer.length >= 3 * 8) {
      const currentTime = new Date().getTime();

      // Process data only once per second
      if (currentTime - lastProcessedTime >= 1000) {
        // Extract 8 bytes (64 bits) for each of the three values
        const value1 = buffer.readDoubleLE(0);
        const value2 = buffer.readDoubleLE(8);
        const value3 = buffer.readDoubleLE(16);

        // Log the received data immediately
        console.log("Received data:", { value1, value2, value3 });

        // Check if all three values are non-zero; if not, skip storing the data
        if (value1 !== 0 || value2 !== 0 || value3 !== 0) {
          idCounter++; // Increment the ID counter
          const currentTime = new Date();
          const formattedTime = currentTime.toLocaleTimeString("en-US", {
            hour12: false,
          });
          const newData = {
            id: idCounter,
            time: formattedTime,
            value1,
            value2,
            value3,
          };
          voltageData.push(newData);

          // Send the data to the second server via HTTP
          sendDataToSecondServer(newData);
        }

        lastProcessedTime = currentTime; // Update the last processed time
      }

      // Remove the processed data from the buffer
      buffer = buffer.slice(24); // 3 values * 8 bytes each
    }
  });

  socket.on("end", () => {
    console.log("Client disconnected.");
  });

  socket.on("error", (err) => {
    console.error("Error:", err);
  });
});

// Function to send data to the second server via HTTP using axios
async function sendDataToSecondServer(data) {
  try {
    // const secondServerUrl = "https://myserver-0q44.onrender.com/receiveData";
    const secondServerUrl = "http://localhost:8080/receiveData";

    // Make an HTTP POST request to the second server
    const response = await axios.post(secondServerUrl, data);

    console.log("Data sent to second server:", response.data);
  } catch (error) {
    console.error("Error sending data to the second server:", error);
  }
}

// Start the TCP server on a specific port
const tcpPort = 12345;
tcpServer.listen(tcpPort, () => {
  console.log(`TCP server is listening on port ${tcpPort}`);
});

// Start the Express.js server on a different port
const httpPort = 3000;
server.listen(httpPort, () => {
  console.log(`Express.js server is running on port ${httpPort}`);
});

app.get("/viewVoltageData", (req, res) => {
  res.json(voltageData);
});

app.get("/", (req, res) => {
  res.status(200).send({ message: "good" });
});
