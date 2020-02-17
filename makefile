build:
	docker-compose build

remove-image:
	docker-compose down

run:
	docker-compose up

copy:
	docker cp c3po_control_1:/usr/myapp/result_testcase2.csv result.csv
	docker cp c3po_control_1:/usr/myapp/control_inputs.csv control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/measurements.csv measurements.csv
