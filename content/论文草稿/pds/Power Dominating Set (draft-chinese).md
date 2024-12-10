---
author: virgil
email: mailto:virgiling7@gmail.com
create time: 星期三, 九月 25日 2024, 3:01:13 下午
modify time: 星期二, 十月 1日 2024, 3:56:43 下午
---
# Preliminaries

In this section, we provide notions and notations about the PDSP used in this papaer. 

## Graph and Neighborhoods

An undirected graph $G = <V, E>$  consists of a *vertex set* $V$ and an *edge set* $E \subseteq V \times V$, where each edge is a 2-element subset of $V$. For an *edge* $e = \{u, v\}$, we say that *vertices* $u$ and $v$ are the *endpoints* of edge $e$. 
 
Two vertices are neighbors if and only if they both belong to some common edge. We denote $N(v) = \{u \in V |\{u, v\} \in E\}$, the set of neighbors of a vertex $v$, and its degree is $deg(v) = |N(v)|$.

The distance between two vertices $u$ and $v$, denoted by $dist(u, v)$, is the number of edges in  the shortest path between them.

### Def 1

For a vertex $v$ , we define its i-th-level neighborhoods as $N_{i}(v) = \{u \in V| dist(u, v) = i \}$, $i$-level neighborhoods as  $N_{\leq i}(v) = \bigcup_{j = 1}^i N_{j}(v)$

### Def 2

We call a Reduced Graph of graph $G = <V, E>$ as $G_{\mathcal{R}} = <V_{\mathcal{R}}, E_{\mathcal{R}}>$, where $V_{\mathcal{R}} \subseteq V, E_{\mathcal{R}} \subseteq E$.

## Power Dominating Set

For a given graph $G$, the Power Dominating Set Problem is to find a minimum vertex set $S^* \subseteq V$ of selected vertices such that all vertices of the graph are observed. We call such set a power dominating set.

Whether a vertex is *observed* is determined by the following rules, which are applied iteratively:

- **DOMINATING**: A vertex $u$ is observed if one of its neigbhorhood $v \in S^*$ or itself $u \in S^*$
- **PROPAGATING**: If an observed vertex $u$ of degree $deg(u) \geq 2$ is adjacent to $deg(u) - 1$ observed vertices, the the remaining unobserved neighbour becomes observed, too

We mark the second rules as ablitity of a vertex, those vertices which have the **prop** ablitity, we notion as $V_{prop}$.

And we use $G_{\mathcal{D}} = <V, E_{\mathcal{D}}>$  called *dependence graph*, to describe the observing relationship: 

- **DOMINATING**: A vertex $v$ is in $S^*$, then for all $u \in N(v)$, we have a direct edge $<v, u> \in E_{\mathcal{D}}$ 
- **PROPAGATING**: If vertex $u$ is propagated by vertex $v$, then we have a direct edge $<v, u> \in E_{\mathcal{D}}$

*Notice* a vertex $v$ in $S^*$ has no in-come edges in dependence graph $G_{\mathcal{D}}$.

In the Reduce section, we could select those vertice that must in an optimum solution $S^*$, and those vertices that can not in $S^*$. We use $V_{pre}$ and $V_{del}$ 
# Graph Reduce

In this section, we present some theoretical results usefule for graph reductions.\
## Properties

The first result is starightforward.

**Property 1**:  If $v$ is an undecided node which $deg(v) = 1$, and it is attached to a non-excluded vertex $u$ (i.e. $u \not \in V_{del}$)，then $v \in V_{del}$ . Furthermore, if $u \in V_{prop}$, we can delete $v$ and exclude $u$ from $V_{prop}$, and if $u \not \in V_{del}$, we could select $u$ into $V_{pre}$ .

*Proof.* Let $v \in V$ and $deg(v) = 1$ with neighbor $u \in V$. Let $S^*$ be the optimal solution. If $v \in S^*$ and $u \not \in V_{del}$,  consider solution $S^{*\prime} = (S^* - \{ v \}) \bigcup \{ u \}$,  since $v$ is a leaf node, it can only observe node $u$, so solution $S^{*\prime}$ is an equivalent solution of solution $S^*$, which means an optimal solution. 
# Local Search

## Score Function

We define a function $score(v)$ to evaluation a vertex whether is a important vertex. 

It is natural to decide a function $score(v)$ as adding vertex $v$ into $S$, the number of vertice which are newly observed. 

- [ ] 增加如何计算，随机化，以及移除点的打分

## Initialize

We use *Greedy* strategy to initialize a feasible solution $S$ in reduced graph $G_{\mathcal{R}}$

It starts with current solution $S$ with $V_{pre}$, and initialize the candidate set $C$ with an empty set, the availiable candidate set $C_{A}$ into $V - V_{del}$ 

In the first iteration, we choose a vertex $v \in C_{A}$ randomly, and add it into $S$.

After adding, we will update the candidate set $C$ by Algorithm *Update_Cand* with operator *adding*.  
Precisely, when adding a vertex $v$ into currect solution $S$, we will have a vertice set where all vertices in are newly observed by $v$. We use $Ob(v)$ to represent. 
Then we could get a new set called $N_{1}[Ob(v)]$ , which means $\bigcup_{i}^{|Ob(v)|} N_{1}[u], u \in Ob(v)$, then for each vertex $u \in C_{A}$, we check $t \in N(u), t \in N_{1}[Ob(v)]$, if so, we add this vertex into candidate set $C$

Then, we iteratively select a vertex $v$ from candidate set $C$ with the highest score to add into currect solution $S$.