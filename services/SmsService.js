const axios = require("axios");
const { addSms } = require("./SmsCounterService");
require("dotenv").config();

// to send register sms
const sendRegisterSMS = async (mobileno, name) => {
  if (!mobileno) {
    throw new Error("Missing required parameters: mobileno or msgtext.");
  }

  const url = process.env.REGISTER_SMS_URL.replace(
    "MOBILE_NO",
    mobileno
  ).replace("NAME", name);

  try {
    const response = await axios.get(url, { timeout: 10000 });

    if (!response || response.status !== 200) {
      throw new Error("SMS API did not respond properly");
    }

    if (
      typeof response.data === "string" &&
      response.data.toLowerCase().includes("error")
    ) {
      console.error("❌ Error in SMS response:", response.data);
      throw new Error(`SMS API responded with an error: ${response.data}`);
    }
    await addSms({
      to: mobileno,
      type: "register",
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ SMS API Error:", error.response.data);
      // throw new Error(SMS API Error: ${error.response.data});
    } else if (error.request) {
      console.error("❌ No response received from SMS API");
      // throw new Error('No response received from SMS API');
    } else {
      console.error("❌ General Error sending SMS:", error.message);
      // throw error;
    }

    // Optionally return null or custom safe response
    return null;
  }
};

// to send absent sms
const sendAbsentSMS = async (students) => {
  if (!students) {
    throw new Error("Missing required parameters: students.");
  }
  const urls = students.map((student) => {
    return process.env.ABSENT_SMS_URL.replace(
      "MOBILE_NO",
      student.mobilenumber
    ).replace("NAME", `${student.name} ${student.surname}`);
  });

  try {
    const responses = Promise.all(
      urls.map((url) => axios.get(url, { timeout: 10000 }))
    );

    // mapped mobile and type
    const mapped = students.map((student) => {
      return {
        to: student.mobilenumber,
        type: "absent",
      };
    });
    await addSms(mapped);

    const results = await responses;
    return results;
  } catch (e) {
    throw e;
  }
};

// to send payment sms
const sendPaymentSMS = async (mobileno, amount, date, mode, payment_id) => {
  if (!mobileno) {
    throw new Error("Missing required parameters: mobileno or msgtext.");
  }

  const url = process.env.PAYMENT_SMS_URL.replace("MOBILE_NO", mobileno)
    .replace("AMOUNT", amount)
    .replace("DATE", date)
    .replace("MODE", mode)
    .replace("PAYMENT_ID", payment_id);

  try {
    const response = await axios.get(url, { timeout: 10000 });

    if (!response || response.status !== 200) {
      throw new Error("SMS API did not respond properly");
    }

    if (
      typeof response.data === "string" &&
      response.data.toLowerCase().includes("error")
    ) {
      console.error("❌ Error in SMS response:", response.data);
      throw new Error(`SMS API responded with an error: ${response.data}`);
    }

    await addSms({
      to: mobileno,
      type: "payment",
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ SMS API Error:", error.response.data);
      // throw new Error(SMS API Error: ${error.response.data});
    } else if (error.request) {
      console.error("❌ No response received from SMS API");
      // throw new Error('No response received from SMS API');
    } else {
      console.error("❌ General Error sending SMS:", error.message);
      // throw error;
    }

    // Optionally return null or custom safe response
    return null;
  }
};

const sendRegisterMessageToStaff = async (mobileno) => {
  if (!mobileno) {
    throw new Error("Missing required parameters: mobileno or msgtext.");
  }

  const url = process.env.STAFF_REGISTER_URL.replace("MOBILE_NO", mobileno);
  console.log(url);

  try {
    const response = await axios.get(url, { timeout: 10000 });

    if (!response || response.status !== 200) {
      throw new Error("SMS API did not respond properly");
    }

    if (
      typeof response.data === "string" &&
      response.data.toLowerCase().includes("error")
    ) {
      console.error("❌ Error in SMS response:", response.data);
      throw new Error(`SMS API responded with an error: ${response.data}`);
    }

    await addSms({
      to: mobileno,
      type: "register",
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ SMS API Error:", error.response.data);
      // throw new Error(SMS API Error: ${error.response.data});
    } else if (error.request) {
      console.error("❌ No response received from SMS API");
      // throw new Error('No response received from SMS API');
    } else {
      console.error("❌ General Error sending SMS:", error.message);
      // throw error;
    }
  }
};

const sendAbsentMessageToStaff = async (mobilenos) => {
  if (!mobilenos) {
    throw new Error("Missing required parameters: mobileno or msgtext.");
  }

  const mobiles = mobilenos.filter((m) => m && m !== "").join(",");
  const url = process.env.STAFF_ABSENT_URL.replace("MOBILE_NO", mobiles);

  try {
    const response = await axios.get(url, { timeout: 10000 });

    if (!response || response.status !== 200) {
      throw new Error("SMS API did not respond properly");
    }

    if (
      typeof response.data === "string" &&
      response.data.toLowerCase().includes("error")
    ) {
      console.error("❌ Error in SMS response:", response.data);
      throw new Error(`SMS API responded with an error: ${response.data}`);
    }
    const mapped = mobilenos.map((m) => {
      return {
        to: m,
        type: "absent",
      };
    });
    await addSms(mapped);

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ SMS API Error:", error.response.data);
      // throw new Error(SMS API Error: ${error.response.data});
    } else if (error.request) {
      console.error("❌ No response received from SMS API");
      // throw new Error('No response received from SMS API');
    } else {
      console.error("❌ General Error sending SMS:", error.message);
      // throw error;
    }
  }
};

module.exports = {
  sendRegisterSMS,
  sendAbsentSMS,
  sendPaymentSMS,
  sendRegisterMessageToStaff,
  sendAbsentMessageToStaff,
};
