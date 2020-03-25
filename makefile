build:
	docker-compose build

remove-image:
	docker-compose down

run:
	docker-compose up

update:
	cd emulator/models/C3PO
	git pull
	cd ../../..

copy:
	docker cp c3po_control_1:/usr/myapp/result_testcase2.csv results/result.csv
	docker cp c3po_control_1:/usr/myapp/control_inputs.csv results/control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/measurements.csv results/measurements.csv
	docker cp c3po_control_1:/usr/myapp/select_control_inputs.csv results/select_control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/select_measurements.csv results/select_measurements.csv
