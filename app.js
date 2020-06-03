var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var userIn="";
var app = express();

var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;

var url = 'mongodb://localhost:27017/pmatrixdb';

mongoClient.connect(url, function(err, db) {
    createDocuments(db, function() {
        db.close();
    });
});

var createDocuments = function(db, callback) {
    var collection = db.collection("jduser");
    //console.log(collection.count());
    collection.insert([
        {username : "samuel",password: "123456",emailid: "samuel@pm.com", schedule: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"},
        {username : "jose",password: "123456",emailid: "jose@pm.com", schedule: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"},
        {username : "jeff",password: "123456",emailid: "jeff@pm.com", schedule: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"},
    ], function(err, result) {
        callback(result);
    });
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.post('/signin',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jduser");
        var user= req.body.username_field;
        var pass=req.body.password_field;

        user=user.trim();
        pass=pass.trim();

        collection.find({username: user}).toArray(function(err, result) {


            let r = JSON.stringify(result[0]);
            var r2 =r.split(",");
            var r3 =r2[2].split (":");
            var r4 =r3[1];
            var r5 =r4.split('"')[1];
            console.log(r5);
            if (r5==pass){
                console.log("signed in");
                userIn=user;
            };
            db.close();
        });

        console.log(user.length);
        console.log(pass.length);

    });


});
//needs login
app.post('/updateSchedule',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jduser");
        var newSchedule= req.body.schedule_field;

        collection.find({username: userIn}).toArray(function(err, result) {


            let r = JSON.stringify(result[0]);
            var r2 =r.split(",");
            var r3 =r2[4].split (":");
            var r4 =r3[1];
            var r5 =r4.split('"')[1];

            console.log(r5);
            var i;
            for (i = 0; i < newSchedule.length; i++) {
                r5=setCharAt(r5,i,newSchedule.charAt(i));
            }
            collection.updateOne({username: userIn},{
                $set: { "schedule": r5  },
                $currentDate: { lastModified: true }
            })
            console.log(JSON.stringify(collection.findOne({username:userIn})),function (){
                db.close();
            });
        });
    });
});

app.post('/signup',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jduser");
        console.log(req.body);
        var user= req.body.user_field;
        var pass=req.body.pass_field;
        var pass2=req.body.confirmpass_field;
        var email= req.body.email_field;
        var schedule="000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
        user=user.trim();
        pass=pass.trim();
        pass2=pass2.trim();
        email=email.trim();
        if(pass==pass2){
            collection.insertOne(
                { username: user, password: pass, email: email,schedule:schedule},function () {
                    console.log("Signed up");
                    db.close();
                }
            )

        }
    });
});
//needs login
app.post('/createGroup',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jdgroup");
        console.log(req.body);
        var group= req.body.group_field;
        var description= req.body.description_field;
        var conflictMatrix="000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
        group=group.trim();
        description=description.trim();

        collection.insertOne(
            { leader: userIn, name: group, description: description,conflictMatrix:conflictMatrix},function () {
                associateMemberGroup(userIn,group);
                console.log("Group created");
                db.close();
            }
        )


    });
});
//needs login
app.post('/doInvitation',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jdinvitation");
        console.log(req.body);
        var userto= req.body.userinvited_field;
        var group= req.body.groupinviting_field;

        group=group.trim();
        userto=userto.trim();

        collection.insertOne(
            { inving: userIn, invto: userto, group: group},function () {

                console.log("Invitation made");
                db.close();
            }
        )
    });
});
//needs login
app.post('/acceptInvitation',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jdinvitation");
        console.log(req.body);
        var userto= req.body.userinvit_field;
        var group= req.body.groupinv_field;

        group=group.trim();
        userto=userto.trim();

        associateMemberGroup(userto,group);
    });
});

app.post('/generateConflictMatrix', function (req,res) {
    mongoClient.connect(url,  function(err, db) {
        var collection = db.collection("jdgroupmember");
        var collection2 = db.collection("jduser");
        var collection3 = db.collection("jdgroup");
        console.log(req.body);
        var group= req.body.groupname_field;
        var conflictMatrix="000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
        group=group.trim();
        res= "";
        var i;
        var j;
        collection.find({group: group}).toArray( function(err, result) {
            //console.log(result);
            var list=[];
            for(j=0;j<result.length;j++){

                let r = JSON.stringify(result[j]);
                //console.log(r);
                var r2 =r.split(",");
                var r3 =r2[1].split (":");
                var r4 =r3[1];
                var r5 =r4.split('"')[1];

                //console.log(r5);
                list.push(r5);

               // console.log( r5+" "+personShedule);
               // count+=Number(personShedule.charAt(i));
            }
            console.log(list);
            var list2=[];
            collection2.find().toArray(function(err, result2) {
                for(j=0;j<result2.length;j++){
                    let r = JSON.stringify(result2[j]);
                    //console.log(r);
                    var r2 =r.split(",");
                    var r3 =r2[4].split (":");
                    var r4 =r3[1];
                    var r5 =r4.split('"')[1];
                    var r6 =r.split(",");
                    var r7 =r6[1].split (":");
                    var r8 =r7[1];
                    var r9 =r8.split('"')[1];
                    //console.log(r9);

                    if (list.indexOf(r9) >= 0) {
                        //console.log(r5);
                        //var i ;
                        for (i=0;i<conflictMatrix.length;i++){
                            var n=Number(conflictMatrix.charAt(i))+Number(r5.charAt(i));
                            if (n>9) n=9;
                            conflictMatrix=setCharAt(conflictMatrix,i,''+n);
                            //console.log(conflictMatrix);
                        }
                        //console.log(conflictMatrix);
                    }
                }
                console.log(conflictMatrix);

                collection3.updateOne({name: group},{
                    $set: { "conflictMatrix": conflictMatrix},
                    $currentDate: { lastModified: true }

                },function () {
                    db.close();
                });
            });
        });
    });
});
//complementary function
function associateMemberGroup(member,group) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jdgroupmember");
        collection.insertOne(
            { member: member, group: group},function () {
                console.log("Member associated");
                db.close();
            }
        )
    });
}

 function getSchedule(name) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jduser");
        collection.find({username: name}).toArray(function(err, result) {
            let r = JSON.stringify(result[0]);
            var r2 =r.split(",");
            var r3 =r2[4].split (":");
            var r4 =r3[1];
            var r5 =r4.split('"')[1];
            //console.log(r5);
            console.log(r5);
            db.close();
            return new Promise(resolve => {

                resolve(r5);

            });
        });
    });
}

app.get('/consultGroup',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jdgroup");
        var s=req.body.groupco;
        console.log(s);
        collection.find().toArray(function(err, result) {
            let r = JSON.stringify(result[0]);
            console.log(result);
        });

    });
});

app.get('/consultUser',function (req,res) {
    mongoClient.connect(url, function(err, db) {
        var collection = db.collection("jduser");
        collection.find({name: req.body.usernameconsult}).toArray(function(err, result) {
            let r = JSON.stringify(result[0]);
            console.log(r);
        });
    });
});
function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substr(0,index) + chr + str.substr(index+1);
}

module.exports = app;
