# Redis from Scratch

This is a project where I built Redis Server and CLI from scratch.

I also store the data to AWS S3 as you quit the CLI. It wasn't necessary, but I wanna get more into cloud so I decided to do it.

This was my first time spinning up a TCP server. :smile:

Overall almost all operations are implemented. TTL is not implemented however. I was thinking whether I should implement it or storing the data on S3. I decided to go with S3 and not worry about TTL at all.

Before S3 I was simply storing the data in two different JSON files. One for the Map of strings and the other for the Map of Sets.

## How to run

Clone the project.

Run `npm install`.

Create a `.env` file and add the following:

```
AWS_ACCESS_KEY_ID={YOUR_AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY={YOUR_AWS_SECRET_ACCESS_KEY}
```

If you don't have AWS setup, set it up or change the code to store the data locally to JSON files.

Open two terminals.

In the first terminal run `npm run start-server`.

In the second terminal run `npm run start-cli`.

The server is a TCP server. The CLI is a TCP client. You use the CLI to send commands to the server.

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

- Cache objects to speed up reads.
  - Set right TTL.
  - Handle thundering herd on cold start.
- Session store.
- Distributed log. A distributed log is a method of recording and sharing data across multiple servers or systems in a way that preserves the chronological order of events.
- Rate limiter.
- Gaming leaderboards.

# TCP server

A TCP server is a server that listens for TCP connections from the clients through the Transmission Control Protocol (TCP).

TCP protocol is one of the main protocols of the Internet protocol suite.
