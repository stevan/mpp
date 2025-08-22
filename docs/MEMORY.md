<!----------------------------------------------------------------------------->
# GPU Memory
<!----------------------------------------------------------------------------->

<!----------------------------------------------------------------------------->
## Read/Write 
<!----------------------------------------------------------------------------->

### Global Memory

- size    : GBs
- latency : HIGH
- access  : GLOBAL
- perms   : READ, WRITE
- usage   :
    - host I/O 
        - basically data arrays
    - global heap

### Local Memory

- size    : KBs
- latency : HIGH
- access  : THREAD
- perms   : READ, WRITE
- usage   :
    - is just a chunk of global memory, so slow
    - thread "local" heap 
        - private to the thread
        - usually stuff too big to fit in registers

### Shared Memory

- size    : KBs
- latency : LOW
- access  : WARP
- perms   : READ, WRITE
- usage   :
    - sharing immediate results between Warp threads
    - reductions or matrix tile operations

### Register Memory

- size    : ???
- latency : VERY LOW
- access  : THREAD
- perms   : READ, WRITE
- usage   :
    - actual hardware registers
    - thousands per processing unit??
        - shared across threads
        - allocated to thread?? or static??
        - register pressure??

<!----------------------------------------------------------------------------->
## Read-Only
<!----------------------------------------------------------------------------->

### Constant Memory

- size    : ???
- latency : LOW 
- access  : ALL
- perms   : READ
- usage   :
    - read only constant memory
    - caches for efficient broadcast 
        - meaning, all Warp accessing at the same memory location
        - otherwise??? caches get updated for no reason? downside?
    - good for lookup tables everyone needs to access

### Texture Memory

- size    : ???
- latency : LOW
- access  : ALL
- perms   : READ
- usage   :
    - read only cached memory 
    - optimized for "spacial localtiy"???
    - useful for data with 2D and 3D spacial relationships??
        - hardware interpolation??
        - specialized caching??


<!----------------------------------------------------------------------------->
