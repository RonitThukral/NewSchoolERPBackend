const axios = require('axios');

const loginTest = async () => {
    try {
        const userID = "BK2025100";
        const password = "BK2025100";
        const url = "http://localhost:5001/api/students/signin";

        console.log(`Attempting login to ${url} with ${userID}/${password}`);

        const response = await axios.post(url, {
            userID: userID,
            password: password
        });

        console.log("Response Status:", response.status);
        console.log("Response Data:", response.data);
    } catch (error) {
        if (error.response) {
            console.log("Error Status:", error.response.status);
            console.log("Error Data:", error.response.data);
        } else {
            console.log("Error:", error.message);
        }
    }
};

loginTest();
