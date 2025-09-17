import "dotenv/config";

const getOpenAIResponse = async (messages) => {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: messages
        })
    };

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", options);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (err) {
        console.error("Error:", err);
        throw new Error("Failed to fetch OpenAI response");
    }
};

export default getOpenAIResponse;
