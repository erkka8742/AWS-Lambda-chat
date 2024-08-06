const { S3Client } = require("@aws-sdk/client-s3");
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: 'eu-north-1' });

exports.handler = async (event) => {
    const bucketName = 'images09874092387';
    const key = event.body;

    let contentType;
    lowerKey = key.toLowerCase();
    if (lowerKey.endsWith(".jpeg") || lowerKey.endsWith(".jpg")) {
        contentType = "image/jpeg";
    } else if (lowerKey.endsWith(".png")) {
        contentType = "image/png";
    } else if (lowerKey.endsWith(".gif")) {
        contentType = "image/gif";
    } else if (lowerKey.endsWith(".bmp")) {
        contentType = "image/bmp";
    } else if (lowerKey.endsWith(".webp")) {
        contentType = "image/webp";

    } else {
        return {
            statusCode: 400,
            body: "Unsupported file type",
        };
    }

    // luo tyhjän objektin s3:n 
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    try {
        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
        });

        // palauttaa url:n mihin ladataan kuva
        return {
            statusCode: 200,
            body: signedUrl,
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Could not generate signed URL",
        };
    }
};
