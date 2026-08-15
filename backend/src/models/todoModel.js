import db from '../knex/db.js';

// ==================== GROUPS ====================

export const getGroups = async (subjectId, userId) => {
    return await db('revision.todo_groups')
        .where({ subject_id: subjectId, user_id: userId })
        .orderBy('order_index', 'asc')
        .orderBy('created_at', 'asc');
};

export const createGroup = async (subjectId, userId, { name, color = '#8b5cf6', orderIndex = 0 }) => {
    const [group] = await db('revision.todo_groups')
        .insert({
            subject_id: subjectId,
            user_id: userId,
            name: name.trim(),
            color: color || '#8b5cf6',
            order_index: orderIndex || 0,
        })
        .returning('*');
    return group;
};

export const updateGroup = async (groupId, subjectId, userId, { name, color, orderIndex }) => {
    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    if (orderIndex !== undefined) updates.order_index = orderIndex;

    const [group] = await db('revision.todo_groups')
        .where({ id: groupId, subject_id: subjectId, user_id: userId })
        .update(updates)
        .returning('*');
    return group;
};

export const deleteGroup = async (groupId, subjectId, userId) => {
    await db('revision.todo_groups')
        .where({ id: groupId, subject_id: subjectId, user_id: userId })
        .del();
    return true;
};

// ==================== TODOS ====================

export const getTodos = async (subjectId, userId) => {
    const [groups, allTodos] = await Promise.all([
        getGroups(subjectId, userId),
        db('revision.todos as t')
            .leftJoin('revision.todo_groups as g', 't.group_id', 'g.id')
            .where({ 't.subject_id': subjectId, 't.user_id': userId })
            .select(
                't.*',
                'g.name as group_name',
                'g.color as group_color'
            )
            .orderBy('t.order_index', 'asc')
            .orderBy('t.created_at', 'desc')
    ]);

    // Separate root todos and sub-todos
    const subTodosByParent = {};
    const rootTodos = [];

    allTodos.forEach(item => {
        const formatted = {
            id: item.id,
            subjectId: item.subject_id,
            userId: item.user_id,
            groupId: item.group_id,
            groupName: item.group_name || null,
            groupColor: item.group_color || null,
            parentId: item.parent_id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            status: item.status,
            dueDate: item.due_date,
            completedAt: item.completed_at,
            orderIndex: item.order_index,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
        };

        if (item.parent_id) {
            if (!subTodosByParent[item.parent_id]) {
                subTodosByParent[item.parent_id] = [];
            }
            subTodosByParent[item.parent_id].push(formatted);
        } else {
            rootTodos.push(formatted);
        }
    });

    // Attach sub-todos to roots
    const todos = rootTodos.map(parent => {
        const subTodos = subTodosByParent[parent.id] || [];
        // Sort subTodos by order_index, created_at
        subTodos.sort((a, b) => (a.orderIndex - b.orderIndex) || (new Date(a.createdAt) - new Date(b.createdAt)));

        const totalSub = subTodos.length;
        const doneSub = subTodos.filter(s => s.status === 'completed').length;
        const progressPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : (parent.status === 'completed' ? 100 : 0);

        return {
            ...parent,
            subTodos,
            subTodosTotal: totalSub,
            subTodosDone: doneSub,
            progressPct,
        };
    });

    return { groups, todos };
};

export const createTodo = async (subjectId, userId, data) => {
    const {
        title,
        description = '',
        priority = 'medium',
        dueDate = null,
        groupId = null,
        parentId = null,
        status = 'pending',
        orderIndex = 0,
        subTodos = []
    } = data;

    return await db.transaction(async (trx) => {
        const [todo] = await trx('revision.todos')
            .insert({
                subject_id: subjectId,
                user_id: userId,
                group_id: groupId || null,
                parent_id: parentId || null,
                title: title.trim(),
                description: description ? description.trim() : null,
                priority: priority || 'medium',
                status: status || 'pending',
                due_date: dueDate ? new Date(dueDate) : null,
                completed_at: status === 'completed' ? new Date() : null,
                order_index: orderIndex || 0,
            })
            .returning('*');

        // If sub-todos were passed in the payload
        let createdSubTodos = [];
        if (subTodos && Array.isArray(subTodos) && subTodos.length > 0) {
            const subRows = subTodos.map((sub, idx) => ({
                subject_id: subjectId,
                user_id: userId,
                parent_id: todo.id,
                group_id: groupId || null,
                title: (typeof sub === 'string' ? sub : sub.title || '').trim(),
                status: (typeof sub === 'object' && sub.status) ? sub.status : 'pending',
                priority: (typeof sub === 'object' && sub.priority) ? sub.priority : 'medium',
                order_index: idx,
                completed_at: (typeof sub === 'object' && sub.status === 'completed') ? new Date() : null,
            })).filter(r => r.title.length > 0);

            if (subRows.length > 0) {
                createdSubTodos = await trx('revision.todos').insert(subRows).returning('*');
            }
        }

        // Fetch group details if any
        let groupName = null;
        let groupColor = null;
        if (todo.group_id) {
            const grp = await trx('revision.todo_groups').where({ id: todo.group_id }).first();
            if (grp) {
                groupName = grp.name;
                groupColor = grp.color;
            }
        }

        const formattedSubTodos = createdSubTodos.map(s => ({
            id: s.id,
            subjectId: s.subject_id,
            userId: s.user_id,
            groupId: s.group_id,
            parentId: s.parent_id,
            title: s.title,
            description: s.description,
            priority: s.priority,
            status: s.status,
            dueDate: s.due_date,
            completedAt: s.completed_at,
            orderIndex: s.order_index,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
        }));

        const totalSub = formattedSubTodos.length;
        const doneSub = formattedSubTodos.filter(s => s.status === 'completed').length;
        const progressPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : (todo.status === 'completed' ? 100 : 0);

        return {
            id: todo.id,
            subjectId: todo.subject_id,
            userId: todo.user_id,
            groupId: todo.group_id,
            groupName,
            groupColor,
            parentId: todo.parent_id,
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            status: todo.status,
            dueDate: todo.due_date,
            completedAt: todo.completed_at,
            orderIndex: todo.order_index,
            createdAt: todo.created_at,
            updatedAt: todo.updated_at,
            subTodos: formattedSubTodos,
            subTodosTotal: totalSub,
            subTodosDone: doneSub,
            progressPct,
        };
    });
};

export const updateTodo = async (todoId, subjectId, userId, data) => {
    return await db.transaction(async (trx) => {
        const existing = await trx('revision.todos')
            .where({ id: todoId, subject_id: subjectId, user_id: userId })
            .first();

        if (!existing) throw new Error('TODO not found or unauthorized');

        const updates = { updated_at: new Date() };
        if (data.title !== undefined) updates.title = data.title.trim();
        if (data.description !== undefined) updates.description = data.description ? data.description.trim() : null;
        if (data.priority !== undefined) updates.priority = data.priority;
        if (data.dueDate !== undefined) updates.due_date = data.dueDate ? new Date(data.dueDate) : null;
        if (data.groupId !== undefined) updates.group_id = data.groupId || null;
        if (data.orderIndex !== undefined) updates.order_index = data.orderIndex;

        if (data.status !== undefined) {
            updates.status = data.status;
            updates.completed_at = data.status === 'completed' ? new Date() : null;
        }

        const [updated] = await trx('revision.todos')
            .where({ id: todoId })
            .update(updates)
            .returning('*');

        // If subTodos sync is provided
        if (data.subTodos !== undefined && Array.isArray(data.subTodos)) {
            const existingSubTodos = await trx('revision.todos').where({ parent_id: todoId });
            const existingIds = new Set(existingSubTodos.map(s => s.id));
            const incomingIds = new Set(data.subTodos.filter(s => s.id).map(s => s.id));

            // Delete removed sub-todos
            const toDeleteIds = existingSubTodos.filter(s => !incomingIds.has(s.id)).map(s => s.id);
            if (toDeleteIds.length > 0) {
                await trx('revision.todos').whereIn('id', toDeleteIds).del();
            }

            // Update or Insert sub-todos
            for (let idx = 0; idx < data.subTodos.length; idx++) {
                const sub = data.subTodos[idx];
                const subTitle = (typeof sub === 'string' ? sub : sub.title || '').trim();
                if (!subTitle) continue;

                if (sub.id && existingIds.has(sub.id)) {
                    await trx('revision.todos')
                        .where({ id: sub.id })
                        .update({
                            title: subTitle,
                            status: sub.status || 'pending',
                            completed_at: sub.status === 'completed' ? (sub.completedAt || new Date()) : null,
                            order_index: idx,
                            updated_at: new Date()
                        });
                } else {
                    await trx('revision.todos').insert({
                        subject_id: subjectId,
                        user_id: userId,
                        parent_id: todoId,
                        group_id: updated.group_id,
                        title: subTitle,
                        status: (typeof sub === 'object' && sub.status) ? sub.status : 'pending',
                        priority: (typeof sub === 'object' && sub.priority) ? sub.priority : 'medium',
                        order_index: idx,
                        completed_at: (typeof sub === 'object' && sub.status === 'completed') ? new Date() : null,
                    });
                }
            }
        }

        return updated;
    });
};

export const toggleTodoStatus = async (todoId, subjectId, userId, status) => {
    return await db.transaction(async (trx) => {
        const todo = await trx('revision.todos')
            .where({ id: todoId, subject_id: subjectId, user_id: userId })
            .first();

        if (!todo) throw new Error('TODO not found or unauthorized');

        const isCompleted = status === 'completed';
        const completedAt = isCompleted ? new Date() : null;

        await trx('revision.todos')
            .where({ id: todoId })
            .update({
                status,
                completed_at: completedAt,
                updated_at: new Date()
            });

        // If parent todo is toggled, also toggle all of its sub-todos
        if (!todo.parent_id) {
            await trx('revision.todos')
                .where({ parent_id: todoId })
                .update({
                    status,
                    completed_at: completedAt,
                    updated_at: new Date()
                });
        } else {
            // If a sub-todo is toggled, check if all siblings are completed
            const siblings = await trx('revision.todos')
                .where({ parent_id: todo.parent_id });
            const allDone = siblings.length > 0 && siblings.every(s => (s.id === todoId ? isCompleted : s.status === 'completed'));
            
            await trx('revision.todos')
                .where({ id: todo.parent_id })
                .update({
                    status: allDone ? 'completed' : 'pending',
                    completed_at: allDone ? new Date() : null,
                    updated_at: new Date()
                });
        }

        return { id: todoId, status, completedAt };
    });
};

export const deleteTodo = async (todoId, subjectId, userId) => {
    await db('revision.todos')
        .where({ id: todoId, subject_id: subjectId, user_id: userId })
        .del();
    return true;
};
