import boto3
import base64
import json
import re 
client = boto3.client('dynamodb')


def lambda_handler(event, context):
    body = event["body"]
    if (event["isBase64Encoded"]):
        body = str(base64.b64decode(body))
        
    payload = json.loads(body)
    short = payload["short"]
    conditionals = payload["conditionals"]

    if (not re.match("^[a-zA-Z0-9]*$", short)):
        return {
            'statusCode': 400,
            'body': json.dumps('Short URL contains invalid characters')
        }
    
    try:
        client.get_item(TableName='urls', Key={'short': {'S': short}})['Item']
        return {
            'statusCode': 409,
            'body': json.dumps('Short URL already exists')
        }
    except:
        client.put_item(TableName='urls', Item={'short': {'S': short}, 'conditionals': {'S': conditionals}})
    
        return {
            'statusCode': 200,
            'body': json.dumps(short)
        }
