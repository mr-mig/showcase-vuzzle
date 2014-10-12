{
			version: "0.2",
			/**
			 * Helps to synchronize method calls between browser tabs. Register
			 * one stack in script and wrap function call width
			 * stack.process(function). This will ensure that function will be
			 * called once on the last open page. Useful for server-side
			 * generated events. Example: message check via ajax
			 * 
			 * @type {Object}
			 */
			syncStack : function(namespace){
				var _t = this;
				var stack = null;
				var index = 0;
				
				namespace = "syncstack."+namespace;
				
				/**
				 * Serialize the stack to the application context's storage
				 * 
				 * @private
				 * 
				 */
				var _save = function(){
					vu.data.save(namespace,stack);
				};
				
				/**
				 * Deserialize the stack from the application context's storage
				 * 
				 * @private
				 * 
				 */
				var _load = function(){
					stack = vu.data.load(namespace,"[]");
				};
				
				/**
				 * Processes the sync stack
				 * 
				 * @private
				 * 
				 */
				var _processStack = function(){
					// if stack filled with nulls
					// reset it
					if (stack.indexOf(0) == stack.indexOf(1)){
						stack = [];
					}
					if (stack.length > 0){
						index = stack.length;
					}
					
					// unvote previous voted item
					if(stack.indexOf(1) != -1){
						stack[stack.indexOf(1)] = 0;
					}
						
					// vote for current item
					stack[index] = 1;
				};
				
				/**
				 * Registers the listener, which removes the item info from the
				 * stack.
				 * 
				 * @private
				 * 
				 */
				var _register = function(){
					unsafeWindow.addEventListener("beforeunload",function(){
						_t._kill();
					}, false);
				};
				
				/**
				 * Removes the item from the stack.
				 * 
				 * @private
				 */
				this._kill = function(){
					_load();
					stack[index] = null;
			
					if (index != 0 && stack.indexOf(1) == -1){
							stack[stack.lastIndexOf(0)] = 1;
					}
					_save();
				};	

				// init the stack on creation
				_load();
				_processStack();
				_register();
				_save();
			
				return {
					
					/**
					 * Returns item's index in the stack
					 * 
					 * @method
					 * @type {Number}
					 */
					getIndex : function(){
						return index;
					},
					
					/**
					 * Returns the current sync stack
					 * 
					 * @method
					 * @type {Array}
					 */
					getStack : function(){
						_load();
						return stack;
					},
					
					/**
					 * Returns current page vote state. Active pages can call
					 * methods.
					 * 
					 * @method
					 * @type {Boolean}
					 */
					isActive : function(){
						_load();
						return stack[index] == 1;
					},
					
					/**
					 * Call the method specified in synchronous manner, i.e.
					 * only on one page
					 * 
					 * @method
					 * @param {Function}
					 *            f Function to be synchronized
					 */
					process : function(f){
						if(typeof f !== 'function'){
							return;
						} else if(this.isActive()){
							f();
						}
					}
				
				};
			},
			
			/**
			 * Timer synchronized between script launches.
			 */
			SyncTimer : function(namespace){
				if (!namespace){
					throw ("No namespace assigned for timer!");	
				}
				var namespace = "synctimer." + namespace;
				
				var _t = this;
				
				/**
				 * Returns the start time
				 * 
				 * @return {Number} time in milliseconds
				 */
				this.getStartTime = function(){
					return vu.data.load(namespace,0);
				};
				
				/**
				 * Checks, whether the time interval between now and timer's
				 * start time have passed.
				 * 
				 * @method
				 * @param {Number}
				 *            time Interval in milliseconds
				 * @return {Boolean}
				 */
				this.passed = function(time){
					return new Date().getTime() - this.getStartTime() > time;	
				};
				
				/**
				 * Set the start time
				 * 
				 */
				this.start = function(){
					vu.data.save(namespace,new Date().getTime());
				};
				
				var _restart = function(f,i){
					if(_t.passed(i)){
						f();	
						_t.start();
					}	
				};
				
				/**
				 * Check interval and performs some operation. {Function} do
				 * Function to be invoked {Number} interval Time interval
				 */
				this.check = function(func, interval){
					var ch = function(){
						_restart(func, interval);
					}
					
					if (! vu.data.load(namespace)){
						this.start();	
					} else {
						_restart(func, interval);
					}
					setInterval(function(){_restart(func, interval);}, interval);
				};
			}
		}