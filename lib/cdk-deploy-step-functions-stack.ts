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
