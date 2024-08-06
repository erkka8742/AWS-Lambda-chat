const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    let name = event.body;
    let isThere = /§/.test(name);

    let create = true;
    // jos viestissä on § se tarkoittaa, että halutaan liittyä chattiin
    if (isThere) {
        name = name.replace(/§/g, '');
        create = false;
    }

    const client = new DynamoDBClient({});
    const dynamoDB = DynamoDBDocumentClient.from(client);

    // katsotaan onko chattia olemassa
    async function chatExists(chatName) {
        const params = {
            TableName: 'Chats',
            Key: { chatName: chatName },
        };
        const command = new GetCommand(params);
        try {
            const { Item } = await dynamoDB.send(command);
            if (Item) {
                console.log("Chat already exists");
                return "Chat already exists";
            }
            if (create) { return await createChat(chatName); }

            if (!Item) {
                return "Chat not found"
            }
        } catch (error) {
            console.error("Error accessing DynamoDB:", error);
            throw new Error('Failed to check chat existence');
        }
    }


    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fi-FI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Helsinki'
    });

    const formattedParts = formatter.formatToParts(now);

    let day, month, year;
    formattedParts.forEach(({ type, value }) => {
        if (type === 'day') {
            day = value;
        } else if (type === 'month') {
            month = value;
        } else if (type === 'year') {
            year = value;
        }
    });

    const formattedDateTime = `${day}/${month}/${year}`;

    // luodaan uusi chat dynamoon
    async function createChat(chatName) {
        const params = {
            TableName: 'Chats',
            Item: {
                chatName: chatName,
                createdAt: formattedDateTime,
                messages: [],
                connectionIDs: []
            }
        };

        const command = new PutCommand(params);

        try {
            await dynamoDB.send(command);
            console.log("New chat created with name:", chatName);
            return "New chat created";
        } catch (error) {
            console.error("Error creating new chat:", error);
            throw new Error('Failed to create new chat');
        }
    }

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
                console.log(data.Item.createdAt);
                return data.Item.createdAt;
            } else {
                console.log("No item found with the specified key.");
                return null;
            }
        } catch (error) {
            console.error("An error occurred:", error);
            throw error;
        }
    }





    let answer = await chatExists(name);
    let dateOK = "";

    if (answer == "Chat already exists") {
        let dateOld = await getItem("Chats", name);
        dateOK = dateOld
    }

    else {
        dateOK = formattedDateTime
    }

    // palautetaan vastaus ja chatin luontipäivä
    return {
        statusCode: 200,
        body: JSON.stringify({ message: answer, date: dateOK }),
    };
};
