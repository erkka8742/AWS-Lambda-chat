const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {

    let chatName = event.body;
    console.log(chatName)

    // etsii chatin viestit ja palauttaa clienttiin  
    async function getItem(tableName, partitionKey) {
        try {
            const command = new GetCommand({
                TableName: tableName,
                Key: {
                    "chatName": partitionKey
                }
            });

            const data = await docClient.send(command);
            if (data.Item) {
                console.log("Item retrieved successfully:", data.Item);
                return data.Item;
            } else {
                console.log("No item found with the specified key.");
                return null;
            }
        } catch (error) {
            console.error("An error occurred:", error);
            throw error;
        }
    }

    messages = ""
    try {
        const item = await getItem("Chats", chatName);
        if (item) {
            messages = item.messages
        } else {
            console.log("Item not found.");
            return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }
    } catch (error) {
        console.error("Failed to retrieve item:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }


    return { statusCode: 200, body: JSON.stringify({ message: messages }) };

}