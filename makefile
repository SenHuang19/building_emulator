build_julia:
	docker-compose -f docker-compose.yml -f docker-compose_julia.yml -f docker-compose_app.yml build

run_julia:
	docker-compose -f docker-compose.yml -f docker-compose_julia.yml -f docker-compose_app.yml up

clean_julia:
	docker-compose -f docker-compose.yml -f docker-compose_julia.yml -f docker-compose_app.yml down

copy_julia:
	docker cp julia:/usr/myapp/all_result_testcase2.csv 	results/all_result.csv
	docker cp julia:/usr/myapp/control_inputs.csv 				results/all_control_inputs.csv
	docker cp julia:/usr/myapp/measurements.csv 					results/all_measurements.csv
	docker cp julia:/usr/myapp/result_testcase2.csv 			results/sel_result.csv
	docker cp julia:/usr/myapp/select_control_inputs.csv 	results/sel_control_inputs.csv
	docker cp julia:/usr/myapp/select_measurements.csv 		results/sel_measurements.csv

build_python:
	docker-compose -f docker-compose.yml -f docker-compose_python.yml build

run_python:
	docker-compose -f docker-compose.yml -f docker-compose_python.yml up

remove_python:
	docker-compose -f docker-compose.yml -f docker-compose_python.yml down

# docker-compose_python.yml will execute runSimulation.py
# the   # GET TEST INFORMATION section will complile the lists of measurements, control inputs, and simulation results
# to extract the results from docker use
copy_python:
docker cp python:/usr/src/app/controlInputsList.csv 	interfaceLists/controlInputsList.csv
docker cp python:/usr/src/app/measurementsList.csv 		interfaceLists/measurementsList.csv
docker cp python:/usr/src/app/results.csv 						results/results.csv

update:
	cd emulator/models/C3PO
	git pull
	cd ../../..
