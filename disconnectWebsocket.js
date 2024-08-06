const { DynamoDBClient, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    const connectionID = event.requestContext.connectionId;
    console.log("Connection ID:", connectionID);
    chatName = "";


    // etsii IDs tablesta connectionID:n perusteella chatin nimen
    async function getItem(tableName, partitionKey) {
        try {
            const command = new GetCommand({
                TableName: tableName,
                Key: {
                    "connectionID": partitionKey
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

    try {
        const item = await getItem("IDs", connectionID);
        if (item) {
            chatName = item.chatName;
        } else {
            console.log("Item not found.");
            return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }
    } catch (error) {
        console.error("Failed to retrieve item:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }


    // poistaa connectionID:n chats tablesta
    async function updateItem(tableName, partitionKey, arrayAttributeName, stringToRemove) {
        try {
            const updateParams = {
                TableName: tableName,
                Key: { "chatName": partitionKey },
                UpdateExpression: "REMOVE #attr[0]",
                ConditionExpression: "contains(#attr, :strToRemove)",
                ExpressionAttributeNames: {
                    "#attr": arrayAttributeName
                },
                ExpressionAttributeValues: {
                    ":strToRemove": stringToRemove
                },
                ReturnValues: "UPDATED_NEW"
            };

            return await docClient.send(new UpdateCommand(updateParams));
        } catch (error) {
            console.error("Update failed:", error);
            throw error;
        }
    }

    try {
        const result = await updateItem("Chats", chatName, "connectionIDs", connectionID);
        console.log("Item updated successfully:", result);
    } catch (error) {
        console.error("Error updating item:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to update item", details: error.toString() }) };
    }


    // poistaa connectionID:n IDs tablesta
    async function deleteItem() {
        const params = {
            TableName: 'IDs',
            Key: {
                ['connectionID']: { S: connectionID }
            }
        };
        const command = new DeleteItemCommand(params);
        ddbClient.send(command);
    }


    await deleteItem();

    return { statusCode: 200 };
};
