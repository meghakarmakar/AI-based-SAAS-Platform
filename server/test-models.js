import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test different model names
const modelsToTest = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest", 
    "gemini-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro",
    "models/gemini-pro"
];

async function testModels() {
    console.log("Testing available Gemini models...\n");
    
    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: "Say 'test successful'" }] }],
            });
            console.log(`✅ SUCCESS: ${modelName} works!`);
            console.log(`   Response: ${result.response.text()}\n`);
            break; // Stop after first success
        } catch (error) {
            console.log(`❌ FAILED: ${modelName}`);
            console.log(`   Error: ${error.message}\n`);
        }
    }
}

testModels();
