---
layout: post
comments: false
title:  "A brief review on Transmission Control Protocol"
excerpt: "..."
date:   2021-1-11 19:00:00
mathjax: false
---

<div class="imgcap">
<img src="/assets/review_tcp/b3_1.png">
</div>

## Introduction
The TCP protocol provides a standard general-purpose method for reliable delivery of data. For applications 
TCP provides a standard way of accessing remote computers on unreliable internet. This reliability is provided by adding services on top of IP.

The reliability of TCP is achieved by retransmitting data, which has been sent but not acknowledged by receiver within given time. Thus sending TCP must keep the sent data in memory until it has received the acknowledgements of sent data.

TCP assumes that IP is inherently unreliable, so TCP adds services to ensure end2end delivery of data. TCP has very few expectations on the services provided by the networks and it thus can be run across a large variety of hardware. All that is required from lower level is unreliable datagram service.

In many operating systems, the TCP module is accessed like the file system of the operating system. The TCP module depends on other operating system functions to manage its data structures and services. The inferface to the physical network is controlled by a device driver module. TCP doesn't communicate directly to device driver. IP module acts as a middle layer in TCP communication to the network driver. From the abstract viewpoint, applications will interface with the TCP module with the following system calls:
- OPEN  to open a connection
- CLOSE  to close a connection
- SEND  to send data to an open connection
- RECEIVE  to receive data from an open connection
- STATUS  to find information about a connection

## TCP standard

The primary purpose of the TCP is to provide reliable, securable logical circuit or connection service between pairs of processes. This security is based on assumption that the underlying network can be trusted, which is not the case in the current commercial Internet. The statement secure comes from the time, when TCP/IP was primarily used for Military purposes.

TCP provides reliable services on top of a less reliable internet communication system on following area:
- Basic Data Transfer
- Reliability
- Flow Control
- Multiplexing
- Connections
- Precedence and Security

### Basic Data Transfer
The TCP Basic Data Transfer is able to transfer a continuous stream of octects in each direction between its users by packaging some number of octects into segments for transmission through the internet system. 
In general, the TCPs decide when to block and forward data at their own convenience.
Application processes are allowed to send data whatever size that is convenient for sending. At the TCP level there is no real restriction on message size because the details of accommodating the message segments in IP datagrams is the task of the IP layer.
The actual data that is sent by TCP is treated as an unstructured stream of octets. The structuring of data must be handled by the application processes that communicate by using TCP.

### Reliability
Unless there is a physical break in the link that causes physical partitioning of the network, TCP is able to recover most internet communications system errors, such as damaged data, lost data, duplicated data, data delivered out of order.

The TCP assigning a sequence number to each octet transmitted, and requiring a positive ACK from the receiver. If the ACK is not received within the timeout interval, the data is retransmitted. At the receiver, the sequence numbers are used to correctly order segments that may be received out of order. 

Damaged segments are handled by adding a checksum to each segment transmitted. The receiver verifies the checksum discarding damaged segments.

### Flow Control

The sender and reciever can operate at different data rates because of differences in CPU and network bandwidth. As a result, it's possible for sender to send data at a faster rate than the receiver can handle.

TCP implements a flow control mechanism that controls the amount of data send by the sender. This is achieved by using a sliding window mechanism. The receiver TCP module sends back to the sender an acknowledgement that indicates a range of acceptable sequence numbers beyond the last successfully received segment. This range of acceptable sequence numbers is called "window". The sliding window mechanism manages to keep the channel full of data and to reduce the delays for waiting acknowledgements.

### Multiplexing

Different processes may be communicating over the same network inferface. Thus they must be separated from each other. This separation is done by using different port numbers for each process. Port numbers are concatenated with network and host addresses from the internet communication layer, this forms a socket.

### Connections

The combination of the sockets, sequence numbers and window sizes is called a connection.

### Precedence and Security

(passed)

## Problems with TCP 
Basically there are two main reasons for problems with TCP today. First, TCP tries to exceed the underlying network's transport capacity, which causes congestion in the network and reduces connection's data rates. Second, the traditional assumption of TCP is that packet losses always indicates network congnestion. This supposition is usually correct in wired networks but in wireless networks, where corrupted bit errors are common, it reduces data rates dramatically.

**TCP versus lower layer's congestion control** If the lower level layer provides congestion control function, problems arise because of also TCP provides congestion control and these two methods may not notice each other.
 
**Quality of Service** TCP does not offer constant transmission delay and therefore it doesn't match up with multimedia, audio or real-time applications.

**Asymmetry of the network** TCP may suffer due to network asymmetry, especially in the context of wide-area wireless network, since full bandwidth may not be achieved in unidirectional transfer because of the slow arrival of acknowledgements.

**TCP in Wireless Network** The wireless environments have serious issues such as high Bit Error Rate, low bandwidth, mobility, long RTT. Also, there is power consumption issue, because normally mobile hosts have limited power and processing speed compared to base stations, which forms inefficiency in network. Besides, there are many reasons of packet loss like disconnection, corruption by underlying physical medium, handoffs, but TCP assumes it as due to congestion in network.

## Reference
- *TRANSPORT CONTROL PROTOCOL*, Kimmo Ahonen & Juha, 1998
- *TCP for Wireless Environments*, Ranjeet V. Bidwe, et al. , 2016  