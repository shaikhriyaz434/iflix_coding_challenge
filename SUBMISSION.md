# prerequisites
nodeJS 
    --version 8.9 will be preffered
# run program
``` 
sh bin/run
```
# run test
``` 
sh bin/test
```
# Solution
# step 1:
``` 
1. read all the files from `./data/` directory
```
# step 2:
```
1. map all the grants from partners to user accounts using account numbers
    if period is number 
    and period is not  0
2. map all the revokes from from partners to user accounts using account numbers
```
# step 3:
```
1.for each account
    1.1 sort all grants by timestamp
    1.2 for each grant
    1.2.1 if account owner is undefined  OR account owner is not equal to partner of  grant and account is open to grant
        1.2.1.1 calculate the duration of grant
        1.2.1.2 find if there is any revoke issues by same partner during the duration
            if exist update the duration
     1.2.2 else if account owner is  equal to partner of grant
        1.2.2.1 calculate the duration of grant
        1.2.2.2 find if there is any revoke issues by same partner during the duration
            if exist update the duration
```
# step 4:
```
1. write the result in the file '/output/result.json'
```