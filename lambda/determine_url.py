import json
import base64
import boto3

client = boto3.client('dynamodb')

def determine_url(conditionals: dict, data: dict) -> str:
    for i, conditional in enumerate(conditionals):
        #else statement
        if i == len(conditionals) - 1:
            return conditional["url"]
        
        conditions = conditional["conditions"]

        #if AND, start as true and break on first false. 
        #if OR, start as false and break on first true.
        valid = conditional["and"] 

        for condition in conditions:
            if (condition["variable"] == "URL Parameter"):
                variable = data["params"][condition["param"]]
            else:
                variable = data[condition["variable"]]
            
            operator = condition["operator"]
            if operator == "=":
                op = lambda a, b: a == b
            elif operator == "!=":
                op = lambda a, b: a != b
            elif operator == ">":
                op = lambda a, b: a > b
            elif operator == "<":
                op = lambda a, b: a < b
            elif operator == ">=":
                op = lambda a, b: a >= b
            elif operator == "<=":
                op = lambda a, b: a <= b
            elif operator == "Contains":
                op = lambda a, b: a in b
            else:
                valid = False
                break

            if op(variable, condition["value"]):
                if not conditional["and"]: #condition is true, if OR then done
                    valid = True
                    break
                else:
                    continue #keep checking
            else:
                if conditional["and"]: #condition is false, if AND then done
                    valid = False
                    break
                else:
                    continue
        
        if not valid:
            continue
        else:
            return conditional["url"]
            
            
def lambda_handler(event, context):        
    body = event["body"]
    if (event["isBase64Encoded"]):
        body = str(base64.b64decode(body))

    payload = json.loads(body)
    short = payload["short"]
    data = payload["data"]
    
    try:
        conditionals = client.get_item(TableName='urls', Key={'short': {'S': short}})['Item']['conditionals']['S']
        conditionals = json.loads(conditionals)
    except:
        return {
            'statusCode': 404,
            'body': json.dumps('Short URL does not exist')
        }

    url = determine_url(conditionals, data)
    return {
        'statusCode': 200,
        'body': json.dumps(url)
    }
