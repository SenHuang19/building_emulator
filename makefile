# basic docker commends to manage the life-cycle of a docker image.

build:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml build

run:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml up

remove:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml down

# docker-compose_python.yml will execute runSimulation.py
# the   # GET TEST INFORMATION section will complile the lists of measurements, control inputs, and simulation results
# to extract the results from docker use
copy:
	docker cp python:/usr/src/app/controlInputsList.csv 	interfaceLists/controlInputsList.csv
	docker cp python:/usr/src/app/measurementsList.csv 		interfaceLists/measurementsList.csv
	docker cp python:/usr/src/app/results.csv 						results/results.csv



