const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ region: 'eu-north-1' });
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, } = require('@aws-sdk/lib-dynamodb');
const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: "!websocket URL!"
});

exports.handler = async (event) => {

    // tämä lambda aktivoituu, kun s3:n ladataan kuva
    const bucketName = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;

    const objectUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const parts = key.split("%C2%A7");

    const roomName = parts[0];
    const userName = parts[1];

    if (roomName == 'join2Chat') {
        return { statusCode: 500 };
    }

    let IDs = ""
    // etsitään huoneen connection ID:t ja lähetetään url
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

    try {
        const item = await getItem("Chats", roomName);
        if (item) {
            IDs = item.connectionIDs;
        } else {
            console.log("Item not found.");
            return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }
    } catch (error) {
        console.error("Failed to retrieve item:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fi-FI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Helsinki'
    });

    formattedDateTime = formatter.format(now);
    formattedDateTime = formattedDateTime.replace(' klo ', ' ').replace(/\./g, ':').replace(/:/, '/').replace(/:/, '/');

    sendingMessage = {
        "type": "image",
        "username": userName,
        "imageURL": objectUrl,
        "timestamp": formattedDateTime
    }

    console.log("Starting to send messages to connections.");
    const postCalls = IDs.map(async (connectionId) => {
        try {
            console.log(`Attempting to send message to connection ${connectionId}`);
            await apiGatewayClient.send(new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify(sendingMessage))  // lähetettävä viesti
            }));
            console.log(`Message successfully sent to ${connectionId}`);
        } catch (e) {
            console.error(`Failed to send message to connection ${connectionId}: ${e}`);
        }
    });
    await Promise.all(postCalls);


    // tallennetaan viesti huoneen tableen
    try {
        const getCommand = new GetCommand({
            TableName: "Chats",
            Key: { chatName: roomName }
        });

        const getResult = await docClient.send(getCommand);
        if (!getResult.Item) {
            console.log("No chat found with the name:", chatName);
            return { statusCode: 404, body: "Chat not found" };
        }

        const chat = getResult.Item;

        let newMessage = ["image", userName, objectUrl, formattedDateTime]

        const updateCommand = new UpdateCommand({
            TableName: "Chats",
            Key: { chatName: chat.chatName },
            UpdateExpression: "SET messages = list_append(messages, :newMessage)",
            ExpressionAttributeValues: {
                ":newMessage": [newMessage]
            },
            ReturnValues: "UPDATED_NEW"
        });

        await docClient.send(updateCommand);


        return { statusCode: 200, body: "Message added successfully" };
    } catch (error) {
        console.error("Error handling DynamoDB operation:", error);
        return { statusCode: 500, body: "Failed to process DynamoDB operation" };
    }
};
