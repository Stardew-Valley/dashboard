import React, { useEffect, useState } from 'react';
import { QueryDepartmentList } from '../service';
import { message } from 'antd/es';
import { Tree } from 'antd';
import { CaretDownFilled, FolderFilled } from '@ant-design/icons';
import type { DataNode } from 'rc-tree/lib/interface';
import type { ReactNode } from 'react';
import type { DepartmentInterface } from '@/services/department';
import styles from '../index.less';
import _ from 'lodash';

export type DepartmentTreeProps = {
  visible: boolean;
  allDepartments: DepartmentOption[];
};
export interface DepartmentOption extends DepartmentInterface {
  key: any;
  label: string;
  value: string;
}

export interface TreeNode {
  title: string;
  key: string;
  parentKey: string;
  children: TreeNode[];
  checkable?: boolean;
  disableCheckbox?: boolean;
  selectable?: boolean;
  order: number;
  staff_num: number;
}

const buildDepartmentTree = (
  items: DepartmentList.Item[],
): { nodes: TreeNode[]; tree: TreeNode[] } => {
  let nodes: TreeNode[] = [];
  let tree: TreeNode[] = [];
  items.forEach((department) => {
    nodes.push({
      title: department.name,
      key: `${department.ext_id}`,
      parentKey: `${department.ext_parent_id}`,
      children: [],
      checkable: true,
      selectable: false,
      order: department.order,
      staff_num: department.staff_num,
    });
    if (department?.sub_departments) {
      department?.sub_departments.forEach((subDepartment: any) => {
        nodes.push({
          title: subDepartment.name,
          key: `${subDepartment.ext_id}`,
          parentKey: `${subDepartment.ext_parent_id}`,
          children: [],
          checkable: true,
          selectable: false,
          order: department.order,
          staff_num: department.staff_num,
        });
      });
    }
  });

  nodes = nodes.sort((a, b) => {
    return a?.order - b?.order;
  });

  const nodesByKey = _.keyBy(nodes, 'key');
  nodes = _.toArray<TreeNode>(nodesByKey);

  const groupedNodes = _.groupBy(nodesByKey, 'parentKey');
  _.each(_.omit(groupedNodes, `0`), (children, parentKey) => {
    if (nodesByKey[parentKey]) {
      nodesByKey[parentKey].children = children || [];
    }
  });

  tree = _.toArray<TreeNode>(nodesByKey);
  tree = tree.filter((item) => {
    return item.parentKey === `0`;
  });

  return {
    nodes,
    tree,
  };
};

const DepartMentTreeComp = ({ callback }: { callback: (selectedKeys: string[]) => void }) => {
  const [allDepartments, setAllDepartments] = useState<DepartmentList.Item[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentNodes, setDepartmentNodes] = useState<TreeNode[]>([]);
  const [departmentTree, setDepartmentTree] = useState<TreeNode[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<DepartmentOption[]>([]);
  const [keyword] = useState<string>('');
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [checkedNodeKeys, setCheckedNodeKeys] = useState<string[]>([]);
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<string[]>(['1']);
  const allDepartmentMap = _.keyBy(allDepartments, 'ext_id');

  useEffect(() => {
    QueryDepartmentList({ page_size: 5000 })
      .then((res: any) => {
        if (res?.code === 0 && res?.data && res?.data.items) {
          setAllDepartments(res?.data.items);
          setExpandedNodeKeys(['1']);
        }
      })
      .catch((err) => {
        message.error(err);
      });
  }, []);

  const toggleDepartment = (key: string) => {
    const newKeys = checkedNodeKeys.includes(key)
      ? checkedNodeKeys.filter((k) => k !== key)
      : [...checkedNodeKeys, key];
    const items = newKeys.map((k) => allDepartmentMap[Number(k)]).filter(Boolean);
    setSelectedDepartments(items as DepartmentOption[]);
    callback(newKeys);
  };

  const onNodesCheck = (checked: { checked: string[]; halfChecked: string[] }) => {
    const checkedExtDepartmentIDs: number[] = [];
    let selectedExtDepartmentIDs = selectedDepartments.map((item) => item.ext_id);
    let checkedKeys = [...checked.checked];

    const uncheckedKeys = _.difference(checkedNodeKeys, checkedKeys);
    _.forEach<string>(uncheckedKeys, (key: string) => {
      checkedKeys = checkedKeys.filter<string>((checkedKey) => {
        return !checkedKey.includes(key);
      });
    });

    checkedKeys.forEach((key) => {
      checkedExtDepartmentIDs.push(Number(key));
      selectedExtDepartmentIDs.push(Number(key));
    });

    const shouldDeleteExtDepartmentIDs = _.difference(
      _.map(departments, 'ext_id'),
      checkedExtDepartmentIDs,
    );
    selectedExtDepartmentIDs = _.difference(
      _.uniq(selectedExtDepartmentIDs),
      _.uniq(shouldDeleteExtDepartmentIDs),
    );

    const items = selectedExtDepartmentIDs.map((selectedExtDepartmentID) => {
      return allDepartmentMap[selectedExtDepartmentID];
    });

    setSelectedDepartments(items as DepartmentOption[]);
    callback(selectedExtDepartmentIDs.map(String));
  };

  const nodeRender = (node: DataNode): ReactNode => {
    return (
      <div
        onClick={() => {
          toggleDepartment(String(node.key));
        }}
        style={{
          padding: '4px 6px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        <FolderFilled
          style={{
            color: '#47a7ff',
            fontSize: 20,
            marginRight: 6,
            verticalAlign: -6,
          }}
        />
        <span>
          {node.title.length > 14 ? (
            <span>{node.title.slice(0, 13)}...</span>
          ) : (
            <span>{node.title}</span>
          )}
          ({node.staff_num})
        </span>
      </div>
    );
  };

  useEffect(() => {
    const allDepartmentNodeKeys = _.map(departmentNodes, 'key');
    const matchedKeys: string[] = [];
    allDepartmentNodeKeys.forEach((key: string) => {
      selectedDepartments.forEach((department) => {
        if (key === `${department.ext_id}`) {
          matchedKeys.push(key);
        }
      });
    });
    setCheckedNodeKeys(matchedKeys);
  }, [selectedDepartments]);

  useEffect(() => {
    const filteredDepartments = allDepartments.filter((item) => {
      return keyword === '' || item.label.includes(keyword);
    });
    setDepartments(filteredDepartments);
    const { nodes, tree } = buildDepartmentTree(filteredDepartments);
    let checkedKeys: string[] = [];
    nodes.forEach((node) => {
      selectedDepartments.forEach((department) => {
        if (node.key === `${department.ext_id}`) {
          checkedKeys.push(node.key);
        }
      });
    });
    checkedKeys = _.uniq<string>(checkedKeys);
    setCheckedNodeKeys(checkedKeys);
    setDepartmentNodes(nodes);
    setDepartmentTree(tree);
  }, [allDepartments, keyword]);

  return (
    <div>
      <div className={styles.header}>
        <span className={styles.departmentTitle}>部门信息</span>
        <a
          type={'link'}
          onClick={() => {
            const currentStatus = !expandAll;
            if (currentStatus) {
              setExpandedNodeKeys(_.map(departmentNodes, 'key'));
            } else {
              setExpandedNodeKeys(['0']);
            }
            setExpandAll(currentStatus);
          }}
        >
          {!expandAll ? '展开全部' : '收起全部'}
        </a>
      </div>
      <div className={styles.treeContainer}>
        <Tree
          autoExpandParent={false}
          checkStrictly={true}
          checkedKeys={checkedNodeKeys}
          expandedKeys={expandedNodeKeys}
          onExpand={(expandedKeys: string[]) => {
            setExpandedNodeKeys(expandedKeys);
          }}
          height={300}
          switcherIcon={<CaretDownFilled style={{ color: '#47a7ff' }} />}
          multiple={true}
          treeData={departmentTree}
          onCheck={onNodesCheck}
          titleRender={nodeRender}
        />
      </div>
    </div>
  );
};
export default React.memo(DepartMentTreeComp);
