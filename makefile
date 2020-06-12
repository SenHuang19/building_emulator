# basic makefile commends to manage the life-cycle of a docker image.

build:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml build

run:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml up
	
copy:
	docker cp python:/usr/src/app/controlInputsList.csv 	interfaceLists/controlInputsList.csv
	docker cp python:/usr/src/app/measurementsList.csv 		interfaceLists/measurementsList.csv
	docker cp python:/usr/src/app/results.csv 						results/results.csv
	docker cp python:/usr/src/app/infos.json 						results/infos.json

remove:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml down

run_emulator:
	docker-compose -f docker-compose_emulator.yml up	