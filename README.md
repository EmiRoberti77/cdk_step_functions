# Welcome to your CDK step functions

```json
{
  "StartAt": "RandomLambdaRask",
  "States": {
    "RandomLambdaRask": {
      "Next": "RandomLambdaTimeStampState",
      "Retry": [
        {
          "ErrorEquals": [
            "Lambda.ClientExecutionTimeoutException",
            "Lambda.ServiceException",
            "Lambda.AWSLambdaException",
            "Lambda.SdkClientException"
          ],
          "IntervalSeconds": 2,
          "MaxAttempts": 6,
          "BackoffRate": 2
        }
      ],
      "Type": "Task",
      "OutputPath": "$.Payload",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "arn:aws:lambda:us-east-1:432599188850:function:RandomLambdaFunction",
        "Payload.$": "$"
      }
    },
    "RandomLambdaChoiceState": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.value",
          "NumericLessThan": 0.3,
          "Next": "RandomLambdaFailedState"
        },
        {
          "And": [
            {
              "Variable": "$.value",
              "NumericGreaterThan": 0.3
            },
            {
              "Variable": "$.value",
              "NumericLessThan": 0.7
            }
          ],
          "Next": "RandomLambdaRask"
        },
        {
          "Variable": "$.value",
          "NumericGreaterThan": 0.7,
          "Next": "RandomLambdaSucceedState"
        }
      ]
    },
    "RandomLambdaWaitState": {
      "Type": "Wait",
      "Seconds": 5,
      "Next": "RandomLambdaChoiceState"
    },
    "RandomLambdaTimeStampState": {
      "Type": "Pass",
      "ResultPath": "$",
      "Parameters": {
        "value.$": "$.value",
        "timestamp.$": "$$.State.EnteredTime"
      },
      "Next": "RandomLambdaWaitState"
    },
    "RandomLambdaFailedState": {
      "Type": "Fail",
      "Error": "Error:value is less then .3",
      "CausePath": "States.JsonToString($.value)"
    },
    "RandomLambdaSucceedState": {
      "Type": "Succeed"
    }
  }
}
```
## Graph view of step functions
<img width="442" alt="Screenshot 2024-08-11 at 14 22 02" src="https://github.com/user-attachments/assets/cc396bb3-2b5e-48fa-aa9b-3cac91712147">

## how to create the step functions stack in cdk

```typescript
import * as cdk from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  Choice,
  Condition,
  DefinitionBody,
  Fail,
  Pass,
  StateMachine,
  Succeed,
  Wait,
  WaitTime,
} from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { join } from "path";
const RandomLambdaFunction = "RandomLambdaFunction";
const RandomLambdaTask = "RandomLambdaRask";
const RandomLambdaTimeStampState = "RandomLambdaTimeStampState";
const RandomLambdaWaitState = "RandomLambdaWaitState";
const RandomLambdaSucceedState = "RandomLambdaSucceedState";
const RandomLambdaFailedState = "RandomLambdaFailedState";
const RandomLambdaChoiceState = "RandomLambdaChoiceState";
const RandomLambdaStateMachine = "RandomLambdaStateMachine";

export class CdkDeployStepFunctionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ramdomLambaFunction = new NodejsFunction(this, RandomLambdaFunction, {
      functionName: RandomLambdaFunction,
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: join(
        __dirname,
        "..",
        "src",
        "lambdas",
        RandomLambdaFunction,
        "handler.ts"
      ),
    });

    const randomNumberTask = new LambdaInvoke(this, RandomLambdaTask, {
      lambdaFunction: ramdomLambaFunction,
      outputPath: `$.Payload`,
    });

    const addTimeStampState = new Pass(this, RandomLambdaTimeStampState, {
      parameters: {
        "value.$": "$.value",
        "timestamp.$": "$$.State.EnteredTime",
      },
      resultPath: "$",
    });

    const waitState = new Wait(this, RandomLambdaWaitState, {
      time: WaitTime.duration(cdk.Duration.seconds(5)),
    });

    const succeedState = new Succeed(this, RandomLambdaSucceedState);
    const failedState = new Fail(this, RandomLambdaFailedState, {
      error: "Error:value is less then .3",
      causePath: "States.JsonToString($.value)",
    });

    const choiceState = new Choice(this, RandomLambdaChoiceState);
    choiceState.when(Condition.numberLessThan("$.value", 0.3), failedState);
    choiceState.when(
      Condition.and(
        Condition.numberGreaterThan("$.value", 0.3),
        Condition.numberLessThan("$.value", 0.7)
      ),
      randomNumberTask
    );
    choiceState.when(Condition.numberGreaterThan("$.value", 0.7), succeedState);

    const stateMachine = new StateMachine(this, RandomLambdaStateMachine, {
      definitionBody: DefinitionBody.fromChainable(
        randomNumberTask
          .next(addTimeStampState)
          .next(waitState)
          .next(choiceState)
      ),
    });
  }
}
```
## stack deployed 

<img width="1020" alt="Screenshot 2024-08-11 at 14 23 32" src="https://github.com/user-attachments/assets/b2e307aa-2b42-467b-8dba-883c181e1a40">

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
