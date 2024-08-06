const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    const connectionID = event.requestContext.connectionId;
    console.log(event);

    let bodyObject = JSON.parse(event.body);
    let chatName = bodyObject.message;

    console.log(connectionID);
    console.log(chatName);

    // etsitään dynamosta oikea chatin item
    try {
        const getCommand = new GetCommand({
            TableName: "Chats",
            Key: { chatName: chatName }
        });

        const getResult = await docClient.send(getCommand);
        if (!getResult.Item) {
            console.log("No chat found with the name:", chatName);
            return { statusCode: 404, body: "Chat not found" };
        }

        const chat = getResult.Item;

        // lisättään dynamo itemiin connectionID
        const updateCommand = new UpdateCommand({
            TableName: "Chats",
            Key: { chatName: chat.chatName },
            UpdateExpression: "SET connectionIDs = list_append(connectionIDs, :newId)",
            ExpressionAttributeValues: {
                ":newId": [connectionID]
            },
            ReturnValues: "UPDATED_NEW"
        });

        const updateResult = await docClient.send(updateCommand);
        console.log("Update result:", updateResult);

        // lisätään IDs tableen connectionID item
        const putCommand = new PutCommand({
            TableName: 'IDs',
            Item: {
                connectionID: connectionID,
                chatName: chatName
            }
        });

        await docClient.send(putCommand);
        console.log("New ID added successfully");

        return { statusCode: 200 };
    } catch (error) {
        console.error("Error handling DynamoDB operation:", error);
        return { statusCode: 500, body: "Failed to process DynamoDB operation" };
    }
};
