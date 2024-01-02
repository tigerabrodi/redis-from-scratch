# Redis from Scratch

# What is Redis?

Redis is an in-memory data structure store, used as a distributed, in-memory key-value database, cache, and message broker.

If you install Redis on your machine, you can start it with `redis-server`. You can then connect to it with `redis-cli`.

# Why is Redis so fast?

Redis is fast because it's in-memory. It's also single-threaded, which means it doesn't have to worry about locking. Locking is a problem that occurs when multiple threads try to access the same data at the same time.

Redis uses RAM to store data. RAM is faster than disk.

The trade off here is dataset cannot be larger than memory.

## Thousands of connections?

How does Redis handle thousands of connections?

This is where Multiplexing I/O is a technique used in computer systems to handle multiple input/output requests in parallel.

Key points:

- **select/poll/epoll:** Allow a program to monitor multiple file descriptors, waiting until one or more of the file descriptors become "ready" for some class of I/O operation (e.g., input possible).
- **File descriptor:** This is an abstract indicator (handle) used to access a file or other input/output resource, such as a pipe or network socket.

Multiplexing I/O is what allows a single thread to manage multiple connections

# Use cases for Redis
