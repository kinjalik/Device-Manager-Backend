# Device Manager - Android Client
**This is part of my final project on course "Samsung IT School". All code, configurations, etc published under the MIT License**
## Description
This application stores an information about user's gadgets, such as an IMEI, Serial Number or other identificators.
This information can be helpful in the next cases:
- Your device was stolen, so you can provide an authorities identificators, which can help during an investigation.
- Your property was destructed/burned/etc and you need to document a damage, including gadgets. 

More information about the Android client you can read in his [repository](https://github.com/kinjalik/Device-Manager-for-Android)

This part provides an REST API for client-server interaction

## Architecture
### Runtime Information
- **Runtime**: NodeJS 
- **Web Server*: Express
- **Database**: PostgreSQL
- **Logger**: Winston

### Database Model
![Diagram of database](/screenshots/database_schema.png)

## API
### Entitiy "User"
| Field      	| Type    	| Description                                                                                                          	|
|------------	|---------	|----------------------------------------------------------------------------------------------------------------------	|
| id         	| int     	| Main unique identificator of user                                                                                    	|
| login      	| string  	| Human readable unique identification of user                                                                         	|
| name       	| string  	|                                                                                                                      	|
| surname    	| string  	|                                                                                                                      	|
| email      	| string  	|                                                                                                                      	|
| password   	| string  	| Filled only while authorizing, usually null                                                                          	|
| reg_date   	| string  	| It should be an integer with Unix Timestamp, but because of lack of time I uses a string representation of JS's Date 	|
| has_permit 	| boolean 	| Filled only in server's response, indicates an authorization status of user                                          	|

## Entitiy "Device"
| Field       	| Type   	| Description                         	|
|-------------	|--------	|-------------------------------------	|
| id          	| int    	| Main unique identificator of device 	|
| name        	| string 	|                                     	|
| description 	| string 	|                                     	|
| owner_id    	| int    	| ID of device owner                  	|

## Entity "Device Property"
| Field     	| Type   	| Description                           	|
|-----------	|--------	|---------------------------------------	|
| id        	| int    	| Main unique identificator of device   	|
| name      	| string 	|                                       	|
| value     	| string 	|                                       	|
| device_id 	| int    	| ID of device, which has this property 	|
