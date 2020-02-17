IMG_NAME=emulator

COMMAND_RUN=docker run \
	  --name ${IMG_NAME} \
	  --rm \
 	  -it \
	  -p 127.0.0.1:5000:5000

build:
	docker build --build-arg testcase=${TESTCASE} --no-cache --rm -t ${IMG_NAME} .

remove-image:
	docker rmi ${IMG_NAME}

run:
	$(COMMAND_RUN) --detach=false ${IMG_NAME} /bin/bash -c "python startREST.py --fmuPath=/home/developer/models/LargeBuilding.fmu --fmuStep=60 && bash"
