        //let random;
    
        $(document).ready(() => {
            // https://pixijs.io/examples/#/basics/basic.js
            var app = new PIXI.Application(800, 800, {backgroundColor : 0x1099bb});
            document.body.appendChild(app.view);
            let g = new Game(app, 10,10);

            let blocked = [[4,4],[4,5],[4,6],[4,8],[4,9]
                          ,[5,4],[6,4],[8,4]
                          ,[6,2],[6,4],[6,6]
                          ,[1,2],[1,5]
                          ]
            for(let i = 0; i < blocked.length; i++) {
                g.spawnStaticObjectAt(blocked[i][0],blocked[i][1]);    
            }

            $("#seed").val(Math.round(Math.random() * 100));

            let pause = $("#pauseButton");
            pause.click(e => {
                if(app.ticker.started) {
                    app.ticker.stop();
                    console.log(this);
                    pause.html("Resume"); 
                } else {
                    app.ticker.start();
                    pause.html("Pause");
                }
                
            });
            $("#startButton").click(e => {
                g.random = new Random($("#seed").val());
                app.ticker.add(delta => g.update(delta));
            });
            
        });

 