# Alexa Skill for IoT Nerf Gun
Launch darts from your IoT Nerf Gun using the Amazon Echo.

# Prerequisites

* An IoT Nerf Gun ([build instructions](http://theappslab.com/2015/10/21/connect-all-the-things-an-iot-nerf-gun/))
* AWS Account
* [AWS CLI installed and configured for your AWS Account](https://developer.amazon.com/blogs/post/Tx1UE9W1NQ0GYII/Publishing-Your-Skill-Code-to-Lambda-via-the-Command-Line-Interface)
* Access to an MQTT Broker/Server (I use [CloudMQTT](https://www.cloudmqtt.com/) which has a free tier)
* A clone of this repository

# Build a custom Alexa Skill
Unfortunately it seems that there are no APIs that allow you to "deploy" your new skill from your workstation, you have to use the Web Application provided by Amazon AWS to create Alexa Skills.  This means you cannot Source Control your skills and hence you won't find anything in this repo.

I will try to describe what you have to do in the AWS Management Console to get a new skill working.  Later we will back this by a Lambda function (which we can Source control and deploy so it is included in this repo).

First, [this is a Amazon's full documentation on creating a new skill](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/overviews/steps-to-build-a-custom-skill), please make sure you are familiar with this, I am not going to explain everything, just what is needed to get the Nerf Gun skill working.

## Skill information
You can use any Name you want.  You can also use any Invocation Name, however, I used "nerfgun" and that is what I will be using going forward.  If you want to use a different Invocation Name, just know that what follows might be slightly different for you.

## Interaction Model
I used the new (still in Beta at the time of writing) Skill Builder to build my interaction model.  Again, I can't seem to find a way to export and then Source Control this meta data.  If you decide to not use the Skill Builder, I included the intentSchema and the sampleUtterances in this repository in the ```speechAssets``` directory (you won't need these if using the Skill Builder).

Add 1 additional intent (there are already 3 present by default; Cancel, Help and Stop) and call it "launchDartIntent".

Add several Sample Utterances for this intent, e.g. I added:

* I want to launch {nrOfDarts} darts from Nerf Gun {nerfGunIndex}
* Launch {nrOfDarts} darts from Nerf Gun {nerfGunIndex}
* {nrOfDarts} darts from Nerf Gun {nerfGunIndex}
* I want to shoot {nrOfDarts} darts from Nerf Gun {nerfGunIndex}
* I want to shoot {nrOfDarts} darts
* {nrOfDarts} darts
* Launch {nrOfDarts} darts
* I want to launch {nrOfDarts} darts
* Launch {nrOfDarts}
* ...

I included more in ```speechAssets/sampleUtterances.txt```.

You can add as many as you want, maybe variations with "Fire" instead of "Launch" and "Bullets" instead of "Darts".  Just make sure you include {nrOfDarts} and {nerfGunIndex} in your utterances.  

These are called ```slots``` and you need to give them a type (both) of ```AMAZON.NUMBER```.  When you speak the utterance, these slots will contain the variables of your utterance and that will get passed to the Lamba.

I tried to make them mandatory (which they are really), but then the skill would crap out, so you can leave them default (i.e. not mandatory), the Lambda will take care of missing arguments.

Make sure you ```Save Model``` and then ```Build Model``` before you go back to ```Configuration```.

## Configuration
This is where you need to provide the ARN of your Lambda skill so lets create that first, we will come back to this part later.

# Create (JavaScript) AWS Lambda to support Alexa skill
This repo contains everything you need to deploy the Lambda that backs the skill we just created.  This lambda will get called when Alexa recognizes one of the utterance (or a variation of it) and it gets passed all the slot values as parameters (accessable via this.event.request.intent.slots).  It is responsible for firing the darts.

Most of the code I wrote lives in ```index.js```, feel free to have a peep.  It's based on one of the examples provided in [one of the repositories of the Alexa Github Organization](https://github.com/alexa).

## Install dependencies
You need to install all the dependencies before you continue as they need to get deployed as well:

    $ npm install

There are a few environment variables you have to provide on deploy (I will show you how to do that later).  You also need to modify config.js, specifically the exported array that contains MAC Addresses of ESP8266's in the Nerf Guns.  The ones in this repo are of my IoT nerf guns.

## Deploy to AWS Lambda
Once changes, run the following:

    $ npm run deploy -- --function-name triggerNerfGun \
        --environment Variables="{ \
            MQTT_HOST=<providedByYou>, \
            MQTT_PORT=<providedByYou>, \
            MQTT_USER=<providedByYou>, \
            MQTT_PWD=<providedByYou>, \
            APP_ID=<providedByYou> }"

Obviously you have to replace the <providedByYou> values with your actual value.  These will then get stored as environment variables against your Lambda which then can access them at run time.  The APP_ID comes from your Alexa skill, you can find it on the skill dashboard as the ID of your skill (something like ```amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx```).  All the other variables come from your MQTT Broker.

You should see some output confirming that the deploy was successfull.  

We can now test the Lambda to make sure it got deployed successfully and that the env. variables have been set correctly.

## Test your newly deployed Lambda
For that we need to find the Lambda on the [AWS Management Console](https://console.aws.amazon.com/console/home).  On that screen, do a search for ```Lambda``` and that should take you to the AWS Lambda console where you should see a ```triggerNerfGun``` lambda.  That is the Lambda we just deployed.  Click on he name, then click on the ```Actions``` drop-down button and select ```Configure test event```.  In the text area, past the content of lambda.spec from this repository and then hit the ```Save and test``` button.

If all goes well, you should see a message "Execution result: succeeded" and a JSON response object, indicating that all went well.

If you get errors, please double check your env. variables; are they set and are the correct.

If you need to reset your your env. variables you can run:

    $ npm run aws-update-lambda-config -- \
        --function-name triggerNerfGun \
        --environment Variables="{ \
            MQTT_HOST=<providedByYou>, \
            MQTT_PORT=<providedByYou>, \
            MQTT_USER=<providedByYou>, \
            MQTT_PWD=<providedByYou>, \
            APP_ID=<providedByYou> }"

Providing the updated env. variables.

If everything works, but your nerf Gun is not firing, please make sure you provided the correct MAC Addresses.  If not, correct them in config.js and redeploy your Lambda using:

    $ npm run redeploy -- --function-name triggerNerfGun

Please take note of your Lambda ARN (arn:aws:lambda:us-east-1:xxxxxxxxxxxx:function:triggerNerfGun), you will need it next.

We now need to return to the Alexa Skill to complete our configuration.

# Build a custom Alexa Skill: Part 2
## Configuration: Part 2
As Endpoint of your Alexa Skill, select ```AWS Lambda ARN (Amazon Resource Name```, North America, and enter the ARN of the Lambda we just deployed.  

Leave everything else default and hit ```Next```.

## Testing your new Skill
You are now ready to test your new skill.  Make sure you enable your skill for testing! 

Enter an utterance in the provided input field (e.g. "Launch 2 darts") and click on the ```Ask Nerf Center``` button.  If all goes well, your nerf gun should start firing darts.

You can now ask the same from Alexa!

You do not have to Publish your skill for it to work on your Alexa account.  Only if you want to publish your skill to the world (which you probably do not want to do) do you need to complete the rest of the Skill.
Done!
